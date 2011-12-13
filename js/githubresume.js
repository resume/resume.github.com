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

var run = function() {
    var gh_user = gh.user(username),
        itemCount = 0,
        maxItems = 5,
        maxLanguages = 9;

    var res = gh_user.show(function(data) {
        var since = new Date(data.user.created_at);
        since = since.getFullYear();

        var addHttp = '';
        if (data.user.blog && data.user.blog.indexOf('http') < 0) {
            addHttp = 'http://';
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
            reposLabel: data.user.public_repo_count > 1 ? 'repositories' : 'repository',
            followers: data.user.followers_count,
            followersLabel: data.user.followers_count > 1 ? 'followers' : 'follower',
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
                var template = data,
                    html = Mustache.to_html(template, view);
                $('#resume').html(html);
                document.title = name + "'s Résumé";
            }
        });
    });

    gh_user.allRepos(function(data) {
        var repos = data.repositories,
            sorted = [],
            languages = {},
            popularity;

        repos.forEach(function(elm, i, arr) {
            if (arr[i].fork !== false) {
                return;
            }

            if (arr[i].language) {
                if (arr[i].language in languages) {
                    languages[arr[i].language]++;
                } else {
                    languages[arr[i].language] = 1;
                }
            }

            popularity = arr[i].watchers + arr[i].forks;
            sorted.push({position: i, popularity: popularity, info: arr[i]});
        });

        function sortByPopularity(a, b) {
            return b.popularity - a.popularity;
        };

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
                languages = sortLanguages(languages, maxLanguages);
                
                if (languages && languages.length > 0) {
                    var ul = $('<ul class="talent"></ul>'),
                        percent, li;
                    
                    languages.forEach(function(elm, i, arr) {
                        x = i + 1;
                        percent = parseInt((arr[i].popularity / languageTotal) * 100);
                        li = $('<li>' + arr[i].toString() + ' ('+percent+'%)</li>');
                        
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
                    var since, until, date, view, template, html;
                    
                    sorted.forEach(function(elm, index, arr) {
                        if (itemCount >= maxItems) {
                            return;
                        }

                        since = new Date(arr[index].info.created_at);
                        since = since.getFullYear();
                        until = new Date(arr[index].info.pushed_at);
                        until = until.getFullYear();
                        if (since == until) {
                            date = since;
                        } else {
                            date = since + ' - ' + until;
                        }

                        view = {
                            name: arr[index].info.name,
                            date: date,
                            language: arr[index].info.language,
                            description: arr[index].info.description,
                            username: username,
                            watchers: arr[index].info.watchers,
                            forks: arr[index].info.forks,
                            watchersLabel: arr[index].info.watchers > 1 ? 'watchers' : 'watcher',
                            forksLabel: arr[index].info.forks > 1 ? 'forks' : 'fork',
                        };

                        if (itemCount == sorted.length - 1 || itemCount == maxItems - 1) {
                            view.last = 'last';
                        }

                        template = response;
                        html = Mustache.to_html(template, view);

                        $('#jobs').append($(html));
                        ++itemCount;
                    });
                } else {
                    $('#jobs').html('').append('<p class="enlarge">I do not have any public repositories. Sorry.</p>');
                }
            }
        });
    });

    gh_user.orgs(function(data) {
        var orgs = data.organizations,
            sorted = [];

        orgs.forEach(function(elm, i, arr) {
            if (arr[i].login === undefined) {
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
                    
                    var name, view, template, html;
                    
                    sorted.forEach(function(elm, index, arr) {
                        if (itemCount >= maxItems) {
                            return;
                        }
                        name = (arr[index].info.name || arr[index].info.login);
                        view = {
                            name: name,
                            now: now
                        };

                        if (itemCount == sorted.length - 1 || itemCount == maxItems) {
                            view.last = 'last';
                        }
                        template = response;
                        html = Mustache.to_html(template, view);

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
