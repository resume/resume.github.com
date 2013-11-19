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

var opted_out = function(username) {
    var opted_out = false;

    if (githubresume_opt_out_users.indexOf(username) >= 0) {
        opted_out = true;
    } else {
        $.ajax({
            type: 'HEAD',
            async: false,
            url: 'https://api.github.com/repos/' + username + '/.optout',
            statusCode: {
                200: function(data) {
                    opted_out = true;
                }
            }
        });
    }

    return opted_out;
}

var github_user = function(username, callback) {
    $.getJSON('https://api.github.com/users/' + username + '?callback=?', callback);
}

var github_user_repos = function(username, callback, page_number, prev_data) {
    var page = (page_number ? page_number : 1),
        url = 'https://api.github.com/users/' + username + '/repos?callback=?',
        data = (prev_data ? prev_data : []);

    if (page_number > 1) {
      url += '&page=' + page_number;
    }
    $.getJSON(url, function(repos) {
        data = data.concat(repos.data);
        if (repos.data.length > 0) {
            github_user_repos(username, callback, page + 1, data);
        } else {
            callback(data);
        }
    });
}

var github_user_orgs = function(username, callback) {
    $.getJSON('https://api.github.com/users/' + username + '/orgs?callback=?', callback);
}

var run = function() {
    var itemCount = 0,
        maxItems = 5,
        maxLanguages = 9;

    if (opted_out(username)) {
        $.ajax({
            url: 'views/opt_out.html',
            dataType: 'html',
            success: function(data) {
                var template = data;
                $('#resume').html(data);
            }
        });
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

        var name = username;
        if (data.name !== null && data.name !== undefined) {
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
            view.blog = addHttp + data.blog;
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
                            date = since + ' - ' + until;
                        }

                        view = {
                            name: repo.info.name,
                            date: date,
                            language: repo.info.language,
                            description: repo.info.description,
                            username: username,
                            watchers: repo.info.watchers,
                            forks: repo.info.forks,
                            watchersLabel: repo.info.watchers == 0 || repo.info.watchers > 1 ? 'watchers' : 'watcher',
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
                    $('#jobs').html('').append('<p class="enlarge">I do not have any public repositories. Sorry.</p>');
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
