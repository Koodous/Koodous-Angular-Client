angular.module('services.api', [])
.factory('api', ["$http", "$window", "$location", "$upload", function($http, $window, $location, $upload) {

    var KoodousAPI = {};
    KoodousAPI.user = null;
    KoodousAPI.base_api_url = window.base_api_url;

    KoodousAPI.getCurrentUser = function() {
        var request = $http({
            method: 'GET',
            url: KoodousAPI.base_api_url + '/analysts/current',
            cache: true,
        });

        return request.success(function(response){
            KoodousAPI.user = response;
        }).error(function(data, statsCode){
            KoodousAPI.user = false;
        });
    };

    KoodousAPI.getLatestAnalysts = function(){
        var request = $http({
            method: 'GET',
            url: KoodousAPI.base_api_url + '/analysts/latest',
            cache: true,
        });

        return request;
    }
    KoodousAPI.getTrendingAnalysts = function(){
        var request = $http({
            method: 'GET',
            url: KoodousAPI.base_api_url + '/analysts/trending',
            cache: true,
        });

        return request;
    }

    /**
    * Deprecated
    */
    KoodousAPI.getUserToken = function(username, password) {
        data = {username:username, password:password};
        var request = $http({
            method: 'POST',
            url: KoodousAPI.base_api_url + '/get_auth_token',
            data: data,
            cache: true,
        });

        // request.success(function(response){
        //     localStorage.authToken = response.token;
        // }).error(function(){
        //     delete localStorage.authToken;
        // });

        return request;
    };

    KoodousAPI.register = function(user) {
        var request = $http({
            method: 'POST',
            url: KoodousAPI.base_api_url + '/register',
            data: user,
        }).success(function(data){
            // KoodousAPI.getUserToken(user.username, user.password).success(function(){
            //     document.location.href = "/";
            // });
        });

        return request;
    };

    KoodousAPI.activate = function(token){
        var request = $http({
            method: 'GET',
            url: KoodousAPI.base_api_url + '/register/activate',
            params: {
                token: token
            }
        });
        return request;
    }
    KoodousAPI.forgotPassword = function(email){
        var request = $http({
            method: 'POST',
            url: KoodousAPI.base_api_url + '/register/forgot_password',
            data: {
                "email": email
            }
        });
        return request;
    }
    KoodousAPI.resetPassword = function(uid, token, newpassword1, newpassword2){
        var request = $http({
            method: 'POST',
            url: KoodousAPI.base_api_url + '/register/reset_password',
            params: {
                uid: uid,
                token: token,
            },
            data: {
                new_password1: newpassword1,
                new_password2: newpassword2
            }
        });
        return request;
    }

    KoodousAPI.getAPKUploadUrl = function(sha256){
        var url = KoodousAPI.base_api_url + '/apks/'+sha256+'/get_upload_url';

        var request = $http({
            method: 'GET',
            url: url,
        });

        return request;
    };

    /**
    * Deprecated
    */
    KoodousAPI.uploadAPK = function(file){
        var reader = new FileReader();

        reader.onloadend = function(){
            var sha256 = sha256_digest(reader.result);
            var request = KoodousAPI.getAPKUploadUrl(sha256);

            request.success(function(data){                
                var upload_url = data.upload_url;
                if (!upload_url)
                {
                    console.error("KoodousAPI.uploadAPK: No hay url de subida");
                    return false;
                }
                
                //Subida de archivo con Jquery
                var formData = new FormData();
                formData.append('file', file);

                function progressHandlingFunction(e)
                {
                    if(e.lengthComputable)
                    {
                        var percent = String(((e.loaded/e.total)*100)+"%");
                        console.info("Subida: " + percent);
                    }
                }

                $.ajax({
                    url: upload_url,
                    type: "POST",
                    // Form data
                    data: formData,
                    xhr: function()
                    {  // custom xhr
                        myXhr = $.ajaxSettings.xhr();
                        if(myXhr.upload)
                        {
                            myXhr.upload.addEventListener('progress',progressHandlingFunction, false);
                        }
                        return myXhr;
                    },
                    //Ajax events
                    beforeSend: function()
                    {

                    },
                    success: function(data)
                    {
                        
                    },
                    error: function(data)
                    {
                        //TODO: Alertar al usuario
                        alert("Error: "+data.status+' '+data.statusText);
                    },

                    //Options to tell JQuery not to process data or worry about content-type
                    cache: false,
                    contentType: false,
                    processData: false
                });
            });
        };

        //Se lee el contenido del archivo como binario
        reader.readAsArrayBuffer(file);
    };

    KoodousAPI.getAPKs = function(url, filters, cache){
        var data = {};
        cache = cache ? cache : false;

        url = url ? url : KoodousAPI.base_api_url + '/apks?cursor=';

        for (var property in filters){
            if (filters[property] !== ''){
                url += "&" + property + "=" + encodeURIComponent(filters[property]);
            }
        }

        var request = $http({
            method: 'GET',
            url: url,
            cache: cache,
        });

        return request;
    };

    //Deprecated
    // KoodousAPI.getDetectedAPKs = function(page, perPage, filters, cache){
    //     var data = {};
    //     page = page ? page : 0;
    //     var page_size = perPage ? perPage : 50;
    //     cache = cache ? cache : false;

    //     var url = KoodousAPI.base_api_url + '/detected_apks?page='+page+'&page_size='+page_size;

    //     for (var property in filters){
    //         if (filters[property] !== ''){
    //             url += "&" + property + "=" + filters[property];
    //         }
    //     }

    //     var request = $http({
    //         method: 'GET',
    //         url: url,
    //         cache: cache,
    //     });

    //     return request;
    // };

    KoodousAPI.getAPK = function(sha256){
        var request = $http({
            method: 'GET',
            url: KoodousAPI.base_api_url + '/apks/' + sha256,
        });

        return request;
    };

    KoodousAPI.getApkAnalysis = function(sha256, cache){
        cache = cache ? true : false;
        var request = $http({
            method: 'GET',
            url: KoodousAPI.base_api_url + '/apks/' + sha256 + '/analysis',
            cache: cache,
        });

        return request;
    };

    KoodousAPI.forzeApkAnalysis = function(sha256){
        var request = $http({
            method: 'GET',
            url: KoodousAPI.base_api_url + '/apks/' + sha256 + '/analyze',
        });

        return request;
    };

    KoodousAPI.getApkStrings = function(sha256, page, perPage, filters, cache){
        var data = {};
        page = page ? page : 0;
        var page_size = perPage ? perPage : 100;
        cache = cache ? cache : false;

        var url = KoodousAPI.base_api_url + '/apks/' + sha256 + '/strings?page='+page;

        for (var property in filters){
            if (filters[property] !== ''){
                url += "&" + property + "=" + filters[property];
            }
        }

        var request = $http({
            method: 'GET',
            url: url,
        });

        return request;
    };

    KoodousAPI.getApkMetadata = function(sha256, cache){
        cache = cache ? true : false;
        var request = $http({
            method: 'GET',
            url: KoodousAPI.base_api_url + '/apks/' + sha256 + '/metadata',
            cache: cache,
        });

        return request;
    };

    KoodousAPI.getRulesets = function(page, perPage, filters, cache){
        var data = {};
        page = page ? page : 0;
        var page_size = perPage ? perPage : 50;
        cache = cache ? cache : false;

        var url = KoodousAPI.base_api_url + '/user_rulesets?page='+page+'&page_size='+page_size;

        for (var property in filters){
            url += "&" + property + "=" + encodeURIComponent(filters[property]);
        }

        var request = $http({
            method: 'GET',
            url: url,
        });

        return request;
    };

    KoodousAPI.getRuleset = function(id){
        var request = $http({
            method: 'GET',
            url: KoodousAPI.base_api_url + '/user_rulesets/' + id,
        });

        return request;
    };

    KoodousAPI.saveRuleSet = function(ruleset){
        var url = KoodousAPI.base_api_url + '/user_rulesets';
        var method = "POST";
        if (ruleset.id){
            method = "PATCH";
            url = url + '/' + ruleset.id;
        }
        else{
            method = "POST";
        }

        var request = $http({
            method: method,
            data: ruleset,
            url: url,
            headers: {
                "Content-Type": "application/json",
            },
        });
        return request;
    };

    KoodousAPI.deleteRuleset = function(ruleset){
        var url = KoodousAPI.base_api_url + '/user_rulesets/' + ruleset.id;
        var request = $http({
            method: "DELETE",
            url: url,
            // headers: {
            //     "Content-Type": "application/json",
            // },
        });
        return request;
    };

    KoodousAPI.promoteRuleset = function(ruleset){
        var url = KoodousAPI.base_api_url + '/user_rulesets/' + ruleset.id + '/promote_social';
        var request = $http({
            method: "POST",
            url: url,
        });
        return request;
    }

    KoodousAPI.getPublicRulesets = function(page, perPage, filters, cache){
        var data = {};
        page = page ? page : 0;
        var page_size = perPage ? perPage : 50;
        cache = cache ? cache : false;

        var url = KoodousAPI.base_api_url + '/public_rulesets?page='+page+'&page_size='+page_size;

        for (var property in filters){
            url += "&" + property + "=" + encodeURIComponent(filters[property]);
        }

        var request = $http({
            method: 'GET',
            url: url,
        });

        return request;
    };

    KoodousAPI.getPublicRuleset = function(id){
        var request = $http({
            method: 'GET',
            url: KoodousAPI.base_api_url + '/public_rulesets/' + id,
        });

        return request;
    };

    KoodousAPI.getRulesetComments = function(id, url, filters){
        var data = {};

        url = url ? url : KoodousAPI.base_api_url + '/public_rulesets/' + id + '/comments?cursor=';

        for (var property in filters){
            url += "&" + property + "=" + filters[property];
        }

        var request = $http({
            method: 'GET',
            url: url,
        });

        return request;
    };

    KoodousAPI.addRulesetComment = function(ruleset_id, comment){
        var request = $http({
            method: 'POST',
            data: comment,
            url: KoodousAPI.base_api_url + '/public_rulesets/' + ruleset_id + '/comments',
        });

        return request;
    };

    KoodousAPI.getAPKComments = function(sha256, url, filters){
        var data = {};
        
        url = url ? url : KoodousAPI.base_api_url + '/apks/' + sha256 + '/comments?cursor=';

        for (var property in filters){
            url += "&" + property + "=" + filters[property];
        }

        var request = $http({
            method: 'GET',
            url: url,
        });

        return request;
    };

    KoodousAPI.addAPKComment = function(sha256, comment){
        var request = $http({
            method: 'POST',
            data: comment,
            url: KoodousAPI.base_api_url + '/apks/' + sha256 + '/comments',
        });

        return request;
    };

    KoodousAPI.updateComment = function(comment){
        var request = $http({
            method: 'PATCH',
            data: comment,
            url: KoodousAPI.base_api_url + '/comments/' + comment.id,
        });

        return request;
    };

    KoodousAPI.deleteComment = function(comment){
        var request = $http({
            method: 'DELETE',
            url: KoodousAPI.base_api_url + '/comments/' + comment.id,
        });

        return request;
    };

    KoodousAPI.voteAPK = function(sha256, kind){
        var request = $http({
            method: 'POST',
            data: {kind:kind},
            url: KoodousAPI.base_api_url + '/apks/' + sha256 + '/votes',
        });

        return request;
    };
    KoodousAPI.voteRuleset = function(ruleset_id, kind){
        var request = $http({
            method: 'POST',
            data: {kind:kind},
            url: KoodousAPI.base_api_url + '/public_rulesets/' + ruleset_id + '/votes',
        });

        return request;
    };

    KoodousAPI.downloadAPK = function(sha256){
        var request = $http({
            method: 'GET',
            url: KoodousAPI.base_api_url + '/apks/' + sha256 + '/download',
        });
        return request;
    };

    KoodousAPI.getAPKDetections = function(sha256){
        var request = $http({
            method: 'GET',
            url: KoodousAPI.base_api_url + '/apks/' + sha256 + '/detections',
        });
        return request;
    };
    KoodousAPI.getAPKSocialDetections = function(sha256){
        var request = $http({
            method: 'GET',
            url: KoodousAPI.base_api_url + '/apks/' + sha256 + '/social_detections',
        });
        return request;
    };
    KoodousAPI.getAPKVotes = function(sha256, page, perPage, filters){
        var data = {};
        page = page ? page : 0;
        var page_size = perPage ? perPage : 50;

        var url = KoodousAPI.base_api_url + '/apks/' + sha256 + '/votes?page='+page+'&page_size='+page_size;

        for (var property in filters){
            url += "&" + property + "=" + filters[property];
        }

        var request = $http({
            method: 'GET',
            url: KoodousAPI.base_api_url + '/apks/' + sha256 + '/votes',
        });
        return request;
    };
    KoodousAPI.getAPKAVScans = function(sha256){
        var request = $http({
            method: 'GET',
            url: KoodousAPI.base_api_url + '/apks/' + sha256 + '/av_scans',
        });
        return request;
    }
    KoodousAPI.getAPKMi3Report = function(sha256){
        var request = $http({
            method: 'GET',
            url: KoodousAPI.base_api_url + '/apks/' + sha256 + '/mi3_report',
        });
        return request;
    }
    KoodousAPI.updateAPK = function(sha256, data){
        var url = KoodousAPI.base_api_url + "/apks/" + sha256;
        var request = $http({
            method: 'PATCH',
            url: url,
            data: data,
            headers: {
                "Content-Type": "application/json",
            },
        });

        return request;
    };

    KoodousAPI.getUnreadNotifications = function(){
        return KoodousAPI.getNotifications(false, {read:'False'});
    };

    KoodousAPI.getNotifications = function(url, filters){
        var data = {};

        url = url ? url : KoodousAPI.base_api_url + '/notifications?cursor=';

        for (var property in filters){
            url += "&" + property + "=" + filters[property];
        }

        var request = $http({
            method: 'GET',
            url: url,
        });

        return request;
    };

    KoodousAPI.updateNotification = function(notification){
        var url = KoodousAPI.base_api_url + "/notifications/" + notification.id;
        var data = {"read":notification.read};
        var request = $http({
            method: 'PATCH',
            url: url,
            data: data,
            headers: {
                "Content-Type": "application/json",
            },
        });

        return request;
    };

    KoodousAPI.markAllNotificationsAsRead = function(){
        var url = KoodousAPI.base_api_url + "/notifications/mark_all_as_read";
        var request = $http({
            method: 'POST',
            url: url,
            headers: {
                "Content-Type": "application/json",
            },
        });

        return request;
    };

    KoodousAPI.getComments = function(url, filters){
        var data = {};

        url = url ? url : KoodousAPI.base_api_url + '/comments?cursor=';

        for (var property in filters){
            url += "&" + property + "=" + filters[property];
        }

        var request = $http({
            method: 'GET',
            url: url,
        });

        return request;
    };

    KoodousAPI.getUserComments = function(username, url, filters){
        var data = {};
        
        url = url ? url : KoodousAPI.base_api_url + '/analysts/'+username+'/comments?cursor=';

        for (var property in filters){
            url += "&" + property + "=" + filters[property];
        }

        var request = $http({
            method: 'GET',
            url: url,
        });

        return request;
    };

    KoodousAPI.getUserFollowers = function(username, page, perPage, filters){
        var data = {};
        page = page ? page : 1;
        var page_size = perPage ? perPage : 50;

        var url = KoodousAPI.base_api_url + '/analysts/'+username+'/followers?page='+page+'&page_size='+page_size;

        for (var property in filters){
            url += "&" + property + "=" + filters[property];
        }

        var request = $http({
            method: 'GET',
            url: url,
        });

        return request;
    };

    KoodousAPI.getUserFollowing = function(username, page, perPage, filters){
        var data = {};
        page = page ? page : 1;
        var page_size = perPage ? perPage : 50;

        var url = KoodousAPI.base_api_url + '/analysts/'+username+'/following?page='+page+'&page_size='+page_size;

        for (var property in filters){
            url += "&" + property + "=" + filters[property];
        }

        var request = $http({
            method: 'GET',
            url: url,
        });

        return request;
    };

    KoodousAPI.getUserFollowersInifite = function(username, next){
        var data = {};

        if (!next){
            var url = KoodousAPI.base_api_url + '/analysts/'+username+'/followers';
        }
        else{
            var url = next;
        }

        var request = $http({
            method: 'GET',
            url: url,
        });

        return request;
    };
    KoodousAPI.getUserFollowingInifite = function(username, next){
        var data = {};

        if (!next){
            var url = KoodousAPI.base_api_url + '/analysts/'+username+'/following';
        }
        else{
            var url = next;
        }

        var request = $http({
            method: 'GET',
            url: url,
        });

        return request;
    };

    KoodousAPI.getUserRulesets = function(username, page, perPage, filters){
        var data = {};
        page = page ? page : 1;
        var page_size = perPage ? perPage : 50;

        var url = KoodousAPI.base_api_url + '/analysts/'+username+'/rulesets?page='+page+'&page_size='+page_size;

        for (var property in filters){
            url += "&" + property + "=" + filters[property];
        }

        var request = $http({
            method: 'GET',
            url: url,
        });

        return request;
    };

    KoodousAPI.getRulesetDetections = function(rulesetId, url, filters, cache){
        var data = {};
        cache = cache ? cache : false;

        url = url ? url : KoodousAPI.base_api_url + '/ruleset_matches/'+rulesetId+'/apks?cursor=';

        for (var property in filters){
            if (filters[property] !== ''){
                url += "&" + property + "=" + filters[property];
            }
        }

        var request = $http({
            method: 'GET',
            url: url,
            cache: cache,
        });

        return request;
    };

    KoodousAPI.getDeviceAPKs = function(androidId, url, filters, cache){
        var data = {};
        cache = cache ? cache : false;

        url = url ? url : KoodousAPI.base_api_url + '/devices/'+androidId+'/apks?cursor=';

        for (var property in filters){
            if (filters[property] !== ''){
                url += "&" + property + "=" + filters[property];
            }
        }

        var request = $http({
            method: 'GET',
            url: url,
            cache: cache,
        });

        return request;
    };

    KoodousAPI.getAnalysts = function(page, perPage, filters){
        var data = {};
        page = page ? page : 0;
        var page_size = perPage ? perPage : 50;

        var url = KoodousAPI.base_api_url + '/analysts?page='+page+'&page_size='+page_size;

        for (var property in filters){
            url += "&" + property + "=" + filters[property];
        }

        var request = $http({
            method: 'GET',
            url: url,
        });

        return request;
    };

    KoodousAPI.getAnalyst = function(username){
        var url = KoodousAPI.base_api_url + '/analysts/'+username;
        var request = $http({
            method: 'GET',
            url: url,
        });

        return request;
    };

    KoodousAPI.followUser = function(username){
        var data = {};
        var request = $http({
            method: 'GET',
            url: KoodousAPI.base_api_url + '/analysts/'+username+'/follow',
            data: data,
        });

        return request;
    };

    KoodousAPI.unFollowUser = function(username){
        var data = {};
        var request = $http({
            method: 'GET',
            url: KoodousAPI.base_api_url + '/analysts/'+username+'/unfollow',
            data: data,
        });

        return request;
    };

    KoodousAPI.updateAvatar = function(username, file){
        var url = KoodousAPI.base_api_url + "/analysts/"+ username;
        
        var request = $upload.upload({
            url: url,
            method: 'PATCH',
            file : file,
            fileFormDataName: 'avatar'
        });

        return request;
    };

    KoodousAPI.updateUserInfo = function(user){
        var url = KoodousAPI.base_api_url + "/analysts/"+ user.username;
        
        var request = $upload.upload({
            url: url,
            method: 'PATCH',
            data: user,
        });

        return request;
    };

    KoodousAPI.changeUserPassword = function(user, data){
        var url = KoodousAPI.base_api_url + "/analysts/"+ user.username + "/set_password";
        var request = $http({
            method: "POST",
            url: url,
            data: data,
        });

        return request;
    };

    KoodousAPI.getAnalystActivity = function(username, url, filters){
        var data = {};
        
        url = url ? url : KoodousAPI.base_api_url + '/analysts/'+username+'/activity?cursor=';

        for (var property in filters){
            url += "&" + property + "=" + filters[property];
        }

        var request = $http({
            method: 'GET',
            url: url,
        });

        return request;
    };

    KoodousAPI.getGlobalActivity = function(page, perPage, filters){
        var data = {};
        page = page ? page : 1;
        var page_size = perPage ? perPage : 10;

        var url = KoodousAPI.base_api_url + '/activity?page='+page+'&page_size='+page_size;

        for (var property in filters){
            url += "&" + property + "=" + filters[property];
        }

        var request = $http({
            method: 'GET',
            url: url,
        });

        return request;
    };

    KoodousAPI.getAnalystTimeline = function(username, page, perPage, filters){
        var data = {};
        page = page ? page : 1;
        var page_size = perPage ? perPage : 10;

        var url = KoodousAPI.base_api_url + '/analysts/'+username+'/following/activity?page='+page+'&page_size='+page_size;

        for (var property in filters){
            url += "&" + property + "=" + filters[property];
        }

        var request = $http({
            method: 'GET',
            url: url,
        });

        return request;
    };

    KoodousAPI.getUserApkVote = function(sha256){
        var data = {};
        
        var request = $http({
            method: 'GET',
            url: KoodousAPI.base_api_url + '/apks/'+sha256+'/user_vote',
        });

        return request;
    };
    KoodousAPI.getUserRulesetVote = function(ruleset_id){
        var data = {};
        
        var request = $http({
            method: 'GET',
            url: KoodousAPI.base_api_url + '/public_rulesets/'+ruleset_id+'/user_vote',
        });

        return request;
    };

    KoodousAPI.getLinkDeviceToken = function(){
        var data = {};
        
        var request = $http({
            method: 'POST',
            url: KoodousAPI.base_api_url + '/device_link',
        });

        return request;
    };

    KoodousAPI.getInvitations = function(){
        var data = {};
        
        var request = $http({
            method: 'GET',
            url: KoodousAPI.base_api_url + '/invitations',
        });

        return request;
    };
    KoodousAPI.createInvitation = function(invitation){
        var request = $http({
            method: 'POST',
            url: KoodousAPI.base_api_url + '/invitations',
            data: invitation,
        });

        return request;
    };
    KoodousAPI.deleteInvitation = function(invitation){
        var request = $http({
            method: 'DELETE',
            url: KoodousAPI.base_api_url + '/invitations/' + invitation.id,
        });

        return request;
    };

    KoodousAPI.getUserDevices = function(){
        var data = {};
        
        var request = $http({
            method: 'GET',
            url: KoodousAPI.base_api_url + '/devices',
        });

        return request;
    };

    KoodousAPI.removeRulesetMatches = function(ruleset_id, filters){
        var url = KoodousAPI.base_api_url + '/ruleset_matches/'+ ruleset_id +'/apks/remove_matches';

        filters = filters ? filters : {};
        url += "?search=" + filters.search;

        var request = $http({
            method: 'DELETE',
            url: url,
        });

        return request;
    };
    KoodousAPI.removeRulesetMatch = function(ruleset_id, sha256){
        var request = $http({
            method: 'DELETE',
            url: KoodousAPI.base_api_url + '/ruleset_matches/'+ ruleset_id +'/apks/' + sha256,
        });

        return request;
    };

    KoodousAPI.getUserSettings = function(){
        var request = $http({
            method: 'GET',
            url: KoodousAPI.base_api_url + '/settings',
        });

        return request;
    }
    KoodousAPI.updateUserSettings = function(settings){
        var request = $http({
            method: 'PATCH',
            url: KoodousAPI.base_api_url + '/settings',
            data: settings,
        });

        return request;
    }

    return KoodousAPI;
}]);