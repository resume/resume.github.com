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

var github_user = function(username, callback) {
    $.getJSON('https://api.github.com/users/' + username + '?callback=?', callback);
}

var github_user_repos = function(username, callback, page_number, prev_data) {
    var page = (page_number ? page_number : 1),
        url = 'https://api.github.com/users/' + username + '/repos?per_page=100&callback=?',
        data = (prev_data ? prev_data : []);

    if (page_number > 1) {
        url += '&page=' + page_number;
    }
    $.getJSON(url, function(repos) {
        data = data.concat(repos.data);
        if (repos.data.length == 100) {
            github_user_repos(username, callback, page + 1, data);
        } else {
            callback(data);
        }
    });
}

var github_user_issues = function(username, callback, page_number, prev_data) {
    var page = (page_number ? page_number : 1),
        url = 'https://api.github.com/search/issues?q=type:pr+is:merged+author:' + username + '&per_page=100&callback=?'
        data = (prev_data ? prev_data : []);

    if (page_number > 1) {
        url += '&page=' + page_number;
    }

    $.getJSON(url, function(repos) {
        data = data.concat(repos.data.items);
        if (repos.data.total_count == 100) {
            github_user_issues(username, callback, page + 1, data);
        } else {
            callback(data);
        }
    });
}

var github_user_orgs = function(username, callback) {
    $.getJSON('https://api.github.com/users/' + username + '/orgs?callback=?', callback);
}

// Check to see if the user has starred the resume.github.com repo.
//
// Returns true/false.
var github_user_starred_resume = function(username, page) {
    var star  = false;
    var repos = [];
    var page  = (page ? page : 1);
    var url   = 'https://api.github.com/users/' + username + '/starred?per_page=100&page=' + page;
    var errorMsg;

    $.ajax({
        url: url,
        async: false,
        dataType: 'json',
        success: function(data) {
            repos = data;
        },
        error: function(e) {
            if (e.status == 403) {
                errorMsg = 'api_limit'
            } else if (e.status == 404) {
                errorMsg = 'not_found'
            }
        }
    });

    if (errorMsg === 'api_limit' || errorMsg === 'not_found') {
        return errorMsg;
    }

    $.each(repos, function(i, repo) {
        if (repo.full_name == "resume/resume.github.com") {
            star = true;
            return false; // stop iterating
        }
    });

    if (star) {
        return star;
    }

    if (repos.length == 100) {
        star = github_user_starred_resume(username, page + 1);
    }

    return star;
}

var run = function() {
    var itemCount = 0,
        maxItems = 5,
        maxLanguages = 9,
        starred = github_user_starred_resume(username);

    if (!starred || starred === 'api_limit' || starred === 'not_found') {
        if (starred === 'api_limit') {
            $.ajax({
                url: 'views/api_limit.html',
                dataType: 'html',
                success: function(data) {
                    var template = data;
                    $('#resume').html(data);
                }
            });
        } else if (starred === 'not_found') {
            $.ajax({
                url: 'views/not_found.html',
                dataType: 'html',
                success: function(data) {
                    var template = data;
                    $('#resume').html(data);
                }
            });
        } else {
            $.ajax({
                url: 'views/opt_out.html',
                dataType: 'html',
                success: function(data) {
                    var template = data;
                    $('#resume').html(data);
                }
            });
        }
        return;
    }

    var res = github_user(username, function(data) {
        data = data.data;
        var sinceDate = new Date(data.created_at);
        var sinceMonth = sinceDate.getMonth();
        var since = sinceDate.getFullYear();
        var sinceMonth = sinceDate.getMonth();
        var currentYear = (new Date).getFullYear();
        switch (since) {
          case currentYear-1:
            since = 'last year';
            break;
          case currentYear:
            since = 'this year';
            break;
        }

        var addHttp = '';
        if (data.blog && data.blog.indexOf('http') < 0) {
            addHttp = 'http://';
        }

        // set view.name to the "friendly" name e.g. "John Doe". If not defined
        // (in which case data.name is empty), fall back to the login
        // name e.g. "johndoe"
        var name = username;
        if (data.name !== null && data.name !== undefined && data.name.length) {
            name = data.name;
        }

        var avatar = '';
        if (data.type == 'Organization'){
            avatar = data.avatar_url.match(/https:\/\/secure.gravatar.com\/avatar\/[0-9a-z]+/)[0];
            avatar += '?s=140&amp;d=https://github.com/images/gravatars/gravatar-140.png';
        }

        var view = {
            name: name,
            type: data.type,
            email: data.email,
            created_at: data.created_at,
            earlyAdopter: 0,
            location: data.location,
            gravatar_id: data.gravatar_id,
            avatar_url: avatar,
            repos: data.public_repos,
            reposLabel: data.public_repos > 1 ? 'repositories' : 'repository',
            followers: data.followers,
            followersLabel: data.followers > 1 ? 'followers' : 'follower',
            username: username,
            userStatus: 'GitHub user',
            since: since,
            resume_url: window.location
        };

        // We consider a limit of 4 months since the GitHub opening (Feb 2008) to be considered as an early adopter
        if ((since == '2008' && sinceMonth <= 5) || since <= '2007') {
            view.earlyAdopter = 1;
        }

        view.userStatus = getUserStatus();
        function getUserStatus() {
            var COEF_REPOS = 2;
            var COEF_GISTS = 0.25;
            var COEF_FOLLOWERS = 0.5;
            var COEF_FOLLOWING = 0.25;
            var FIRST_STEP = 0;
            var SECOND_STEP = 5;
            var THIRD_STEP = 20;
            var FOURTH_STEP = 50;
            var FIFTH_STEP = 150;
            var EXTRA_POINT_GAIN = 1;

            var statusScore = data.public_repos * COEF_REPOS
                            + data.public_gists * COEF_GISTS
                            + data.followers * COEF_FOLLOWERS
                            + data.following * COEF_FOLLOWING;

            // Extra points
            // - Early adopter
            if (view.earlyAdopter == 1) {
                statusScore += EXTRA_POINT_GAIN;
            }
            // - Blog & Email & Location
            if (view.location && view.location != '' && view.email && view.email != '' && data.blog && data.blog != '') {
              statusScore += EXTRA_POINT_GAIN;
            }

            if (statusScore == FIRST_STEP) {
              return 'Inactive GitHub user';
            }
            else if (statusScore > FIRST_STEP && statusScore <= SECOND_STEP) {
              return 'Newbie GitHub user';
            }
            else if (statusScore > SECOND_STEP && statusScore <= THIRD_STEP) {
              return 'Regular GitHub user';
            }
            else if (statusScore > THIRD_STEP && statusScore <= FOURTH_STEP) {
              return 'Advanced GitHub user';
            }
            else if (statusScore > FOURTH_STEP && statusScore <= FIFTH_STEP) {
              return 'Enthusiastic GitHub user';
            }
            else if (statusScore > FIFTH_STEP) {
              return 'Passionate GitHub user';
            }
        };

        if (data.blog !== undefined && data.blog !== null && data.blog !== '') {
            view.website = addHttp + data.blog;
        }

        var resume = (data.type == 'User' ? 'views/resume.html' : 'views/resumeOrgs.html');
        $.ajax({
            url: resume,
            dataType: 'html',
            success: function(data) {
                var template = data,
                    html = Mustache.to_html(template, view);
                $('#resume').html(html);
                document.title = name + "'s Résumé";
                $("#actions #print").click(function(){
                    window.print();
                    return false;
                });
            }
        });
    });

    github_user_repos(username, function(data) {
        var sorted = [],
            languages = {},
            popularity;

        $.each(data, function(i, repo) {
            if (repo.fork !== false) {
                return;
            }

            if (repo.language) {
                if (repo.language in languages) {
                    languages[repo.language]++;
                } else {
                    languages[repo.language] = 1;
                }
            }

            popularity = repo.watchers + repo.forks;
            sorted.push({position: i, popularity: popularity, info: repo});
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
                        return '<a href="https://github.com/search?q=user%3A'
                            + username + '&l=' + encodeURIComponent(this.name) + '">'
                            + this.name + '</a>';
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

                    $.each(languages, function(i, lang) {
                        x = i + 1;
                        percent = parseInt((lang.popularity / languageTotal) * 100);
                        li = $('<li>' + lang.toString() + ' ('+percent+'%)</li>');

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

                    $.each(sorted, function(index, repo) {
                        if (itemCount >= maxItems) {
                            return;
                        }

                        since = new Date(repo.info.created_at);
                        since = since.getFullYear();
                        until = new Date(repo.info.pushed_at);
                        until = until.getFullYear();
                        if (since == until) {
                            date = since;
                        } else {
                            date = since + ' &ndash; ' + until;
                        }
                        var emojiPattern = /:([a-z0-9_\+\-]+):/g;
                        // no, it's not really a pattern
                        var imagePattern = "<img width='20' height='20' src='https://assets-cdn.github.com/images/icons/emoji/$1.png' />";
                        var description = repo.info.description;
                        repo.info.description = description ? description.replace(emojiPattern, imagePattern) : description;
                        view = {
                            name: repo.info.name,
                            date: date,
                            language: repo.info.language,
                            description: repo.info.description,
                            homepage: repo.info.homepage,
                            username: username,
                            watchers: repo.info.watchers,
                            forks: repo.info.forks,
                            watchersLabel: repo.info.watchers == 0 || repo.info.watchers > 1 ? 'stars' : 'star',
                            forksLabel: repo.info.forks == 0 || repo.info.forks > 1 ? 'forks' : 'fork',
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
                    if(data.length > 0){
                      $('#jobs').html('').append('<p class="enlarge">All of this user\'s repositories seem to be forks. Sorry.</p>');
                    } else {
                      $('#jobs').html('').append('<p class="enlarge">Unfortunately, this user does not seem to have any <strong>public</strong> repositories.</p>');
                    }
                }
            }
        });
    });

    github_user_issues(username, function(data) {
        var sorted = [],
            repos = {};

        $.each(data, function(i, issue) {
            if(repos[issue.repository_url] === undefined) {
                repos[issue.repository_url] = { popularity: 1 }
            } else {
                repos[issue.repository_url].popularity += 1;
            }
        });

        $.each(repos, function(repo, obj) {
            sorted.push({ repo: repo, popularity: obj.popularity});
        })

        function sortByPopularity(a, b) {
            return b.popularity - a.popularity;
        };

        sorted.sort(sortByPopularity);

        $.ajax({
            url: 'views/contrib.html',
            dataType: 'html',
            success: function(response) {
                if (sorted.length > 0) {
                    $('#contrib-jobs').html('');
                    var view, template, html, repoUrl, repoName, commitsUrl;
                    $.each(sorted, function(index, repo) {
                        repoUrl = repo.repo.replace(/https:\/\/api\.github\.com\/repos/, 'https://github.com');
                        repoName = repo.repo.replace(/https:\/\/api\.github\.com\/repos\//, '');
                        commitsUrl = repoUrl + '/commits?author=' + username;
                        view = {
                            count: repo.popularity,
                            username: username,
                            repoUrl: repoUrl,
                            repoName: repoName,
                            commitsUrl: commitsUrl
                        };

                        template = response;
                        html = Mustache.to_html(template, view);

                        $('#contrib-jobs').append($(html));
                    });
                } else {
                    $('#contributions').remove();
                }
            }
        });
    });

    github_user_orgs(username, function(response) {
        var sorted = [];

        $.each(response.data, function(i, org) {
            if (org.login === undefined) {
                return;
            }
            sorted.push({position: i, info: org});
        });

        $.ajax({
            url: 'views/org.html',
            dataType: 'html',
            success: function(response) {
                var now = new Date().getFullYear();

                if (sorted.length > 0) {
                    $('#orgs').html('');

                    var name, view, template, html;

                    $.each(sorted, function(index, org) {
                        if (itemCount >= maxItems) {
                            return;
                        }
                        name = (org.info.name || org.info.login);
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
