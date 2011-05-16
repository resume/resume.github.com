var urlParams = {};
var username;
var trackerId = 'UA-21222559-1';

(function () {
    var e,
        a = /\+/g,  // Regex for replacing addition symbol with a space
        r = /([^&=]+)=?([^&]*)/g,
        d = function (s) { return decodeURIComponent(s.replace(a, " ")); },
        q = window.location.search.substring(1);

    while (e = r.exec(q)) {
       urlParams[0] = d(e[1]);
    }
})();

$(document).ready(function() {
    try {
        if (urlParams[0] !== undefined) {
            username = urlParams[0];
            run();
        } else {
            home();
        }
    } catch (err) {
        try {
            console.log(err);
        } catch (e) {
            /*fail silently*/
        }
    }
});

var error = function() {
    $.ajax({
        url: 'views/error.html',
        dataType: 'html',
        success: function(data) {
            var template = data;
            $('#resume').html(data);
        }
    });
};

var home = function() {
    $.ajax({
        url: 'views/index.html',
        dataType: 'html',
        success: function(data) {
            var template = data;
            $('#resume').html(data);
        }
    });
};

var all_promises = function(array){
    var deferred = $.Deferred();
    var fulfilled = 0, length = array.length;
    var results = [];

    if (length === 0) { 
        deferred.resolve(results);
    } else {
        array.forEach(function(promise, i){
            $.when(promise()).then(function(value) {
                results[i] = value;
                fulfilled++;
                if(fulfilled === length){
                    deferred.resolve(results);
                }
            });
        });
    }

    return deferred.promise();
};

var run = function() {
    var gh_user = gh.user(username);
    var itemCount = 0, maxItems = 5, maxLanguages = 9;

    var res = gh_user.show(function(data) {
        var since = new Date(data.user.created_at);
        since = since.getFullYear();

        var addHttp = '';
        if (data.user.blog !== undefined && data.user.blog !== null && data.user.blog !== '') {
            if (data.user.blog.indexOf('http') < 0) {
                addHttp = 'http://';
            }
        }

        var name = username;
        if (data.user.name !== null && data.user.name !== undefined) {
            name = data.user.name;
        }

        var view = {
            name: name,
            email: data.user.email,
            created_at: data.user.created_at,
            location: data.user.location,
            gravatar_id: data.user.gravatar_id,
            repos: data.user.public_repo_count,
            plural: data.user.public_repo_count > 1 ? 'repositories' : 'repository',
            username: username,
            since: since
        };

        if (data.user.blog !== undefined && data.user.blog !== null && data.user.blog !== '') {
            view.blog = addHttp + data.user.blog;
        }

        $.ajax({
            url: 'views/resume.html',
            dataType: 'html',
            success: function(data) {
                var template = data;
                var html = Mustache.to_html(template, view);
                $('#resume').html(html);
                document.title = name + "'s Résumé";
            }
        });
    });

    gh_user.allRepos(function(data) {
        var repos = data.repositories;

        var sorted = [];
        var languages = {};
        var promises = [];

        function processRepo(repo, pos) {
            if (repo.language) {
                if (repo.language in languages) {
                    languages[repo.language]++;
                } else {
                    languages[repo.language] = 1;
                }
            }

            var popularity = repo.watchers + repo.forks;
            sorted.push({position: pos, popularity: popularity, info: repo});
        }

        repos.forEach(function(elm, i, arr) {
            promises.push(function() {
                return $.Deferred(function(dfd) {
                    // if the repo is a fork, make some jsonp calls
                    // and only resolve the promise after all jsonp
                    // calls are finished
                    if (arr[i].fork !== false) {
                        var gh_repo = gh.repo(username, arr[i].name);
                        gh_repo.show(function(data) {
                            var parent = data.repository.parent.split("/");
                            var gh_fork_parent = gh.repo(parent[0], parent[1]);
                            gh_fork_parent.contributors(function(data) {
                                var contribs = data.contributors;
                                var found = 0;

                                contribs.forEach(function(c) {
                                    if (username == c.login) {
                                        if (c.contributions > -1) {
                                            processRepo(arr[i], i);
                                            dfd.resolve();
                                            found = 1;
                                        }
                                    }
                                });

                                // if none of the contributors match the username
                                // we still need to resolve the promise
                                if (found !== 1) {
                                    dfd.resolve();
                                }
                            });
                        });
                        return;
                    }

                    processRepo(arr[i], i);
                    dfd.resolve();
                }).promise();
            });
        });

        function sortByPopularity(a, b) {
            return b.popularity - a.popularity;
        };

        $.when(all_promises(promises)).then(function() {
            sorted.sort(sortByPopularity);

            var languageTotal = 0;
            function sortLanguages(languages, limit) {
                var sorted_languages = [];
                for (var lang in languages) {
                    if (typeof(lang) !== "string") {
                        continue;
                    }
                    sorted_languages.push({
                        name: lang,
                        popularity: languages[lang],
                        toString: function() {
                            return '<a href="https://github.com/languages/' + this.name + '">' + this.name + '</a>';
                        }
                    });

                    languageTotal += languages[lang];

                }
                if (limit) {
                    sorted_languages = sorted_languages.slice(0, limit);
                }
                return sorted_languages.sort(sortByPopularity);
            }

            $.ajax({
                url: 'views/job.html',
                dataType: 'html',
                success: function(response) {
                    var now = new Date().getFullYear();
                    languages = sortLanguages(languages, maxLanguages);

                    if (languages && languages.length > 0) {
                        var ul = $('<ul class="talent"></ul>');
                        languages.forEach(function(elm, i, arr) {
                            x = i + 1;
                            var percent = parseInt((arr[i].popularity / languageTotal) * 100);
                            var li = $('<li>' + arr[i].toString() + ' ('+percent+'%)</li>');
                            if (x % 3 == 0 || (languages.length < 3 && i == languages.length - 1)) {
                                li.attr('class', 'last');
                                ul.append(li);
                                $('#content-languages').append(ul);
                                ul = $('<ul class="talent"></ul>');
                            } else {
                                ul.append(li);
                                $('#content-languages').append(ul);
                            }
                        });
                    } else {
                        $('#mylanguages').hide();
                    }

                    if (sorted.length > 0) {
                        $('#jobs').html('');
                        itemCount = 0;
                        sorted.forEach(function(elm, index, arr) {
                            if (itemCount >= maxItems) {
                                return;
                            }

                            var relation = 'Creator & Owner';
                            if (arr[index].info.fork === true) {
                                relation = 'Contributor';
                            }

                            var since = new Date(arr[index].info.created_at);
                            since = since.getFullYear();

                            var view = {
                                name: arr[index].info.name,
                                since: since,
                                now: now,
                                language: arr[index].info.language,
                                description: arr[index].info.description,
                                username: username,
                                relation: relation,
                                watchers: arr[index].info.watchers,
                                forks: arr[index].info.forks
                            };

                            if (itemCount == sorted.length - 1 || itemCount == maxItems - 1) {
                                view.last = 'last';
                            }

                            var template = response;
                            var html = Mustache.to_html(template, view);


                            $('#jobs').append($(html));
                            ++itemCount;
                        });
                    } else {
                        $('#jobs').html('');
                        $('#jobs').append('<p class="enlarge">I do not have any public repository. Sorry.</p>');
                    }
                }
            });
        });
    });

    gh_user.orgs(function(data) {
        var orgs = data.organizations;

        var sorted = [];

        orgs.forEach(function(elm, i, arr) {
            if (arr[i].name === undefined) {
                return;
            }
            sorted.push({position: i, info: arr[i]});
        });

        $.ajax({
            url: 'views/org.html',
            dataType: 'html',
            success: function(response) {
                var now = new Date().getFullYear();

                if (sorted.length > 0) {
                    $('#orgs').html('');
                    sorted.forEach(function(elm, index, arr) {
                        if (itemCount >= maxItems) {
                            return;
                        }
                        var view = {
                            name: arr[index].info.name,
                            login: arr[index].info.login,
                            now: now
                        };

                        if (itemCount == sorted.length - 1 || itemCount == maxItems) {
                            view.last = 'last';
                        }
                        var template = response;
                        var html = Mustache.to_html(template, view);

                        $('#orgs').append($(html));
                        ++itemCount;
                    });
                } else {
                    $('#organizations').remove();
                }
            }
        });
    });

};

if (trackerId) {
  var _gaq = _gaq || [];
  _gaq.push(['_setAccount', trackerId]);
  _gaq.push(['_trackPageview']);

  (function() {
    var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
    ga.src = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';
    var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
  })();
}

$(window).bind('error', error);
