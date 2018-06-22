var app = angular.module('app', [
    'dashboard',
    'rulesets',
    'my_rulesets',
    'apks',
    'ranking',
    'analysts',
    'notifications',
    'settings',
    'services.api',
    'filters',
    'ui.router',
    'angular-loading-bar',
    // 'ngAnimate',
    'angularFileUpload',
    'angularMoment',
    'ui.bootstrap',
    'mentio']);

/**
 * Controlador principal
 */
app.controller('AppCtrl', ["$scope", "$rootScope", "api", "$state", "$interval", "$timeout", function ($scope, $rootScope, api, $state, $interval, $timeout) {
    $rootScope.appVersion = window.appVersion;
    $rootScope.getTemplateUrl = function(templatePath){
        return templatePath;
    }
    var intervalRef;

    var request = api.getCurrentUser();
    request.success(function(data) {
        $rootScope.user = data;
    }).error(function(){
        $rootScope.user = {anon:true};
    });

    $scope.app = {
        layout: {}
    };
    if (localStorage && localStorage.isCollapsed == 'true') {
        $scope.app.layout.isCollapsed = true;
    } else {
        $scope.app.layout.isCollapsed = false;
    }
    $scope.$watch("app.layout.isCollapsed", function() {
        localStorage.isCollapsed = $scope.app.layout.isCollapsed;
    });
    $rootScope.$on('$stateChangeSuccess', function() {
        document.body.scrollTop = 0;
        document.documentElement.scrollTop = 0;
    });
    $rootScope.$watch("tooManyRequests", function(newValue, oldValue){
        if ((newValue != oldValue) && newValue == false){
            //Limit has gone. Reload the current view
            $timeout(function(){
                $state.go($state.current, {}, {reload: true});
            },500);
        }
    });
    $rootScope.$watch("secondsToWait", function(newValue, oldValue){
        // Too many requests countdown
        // <59 segundos para evitar limites de dias en downloads y analisis
        if(newValue > 0 && newValue < 59 && !intervalRef){
            intervalRef = $interval(function(){
                $rootScope.secondsToWait--;
                if($rootScope.secondsToWait < 0){
                    $rootScope.tooManyRequests = false;
                }
            },1000,0);
        }
        if(oldValue > 0 && newValue < 0){
            $interval.cancel(intervalRef);
            interval = undefined;
        }
    })
}]);

app.controller('HeaderCtrl', ["$scope", "$rootScope", "$location", "api", "$http", "$upload", "$interval", "$uibModal", function($scope, $rootScope, $location, api, $http, $upload, $interval, $uibModal) {
    $scope.uploading = false;
    $scope.uploadProgress = 0;
    $scope.notifications = [];
    $rootScope.unreadNotifications = 0;
    $rootScope.favicon = new Favico({
        animation: 'none'
    });

    $scope.getNotifications = function() {
        if (!$rootScope.user || !$rootScope.user.username){
            return false;
        }
        api.getNotifications().success(function(data) {
            var notifications = data.results.slice(0, 5);
            for (i = 0; i < notifications.length; i += 1) {
                if (notifications[i].apk) {
                    notifications[i].targetUrl = "/apks/" + notifications[i].apk.sha256;
                } else if (notifications[i].analyst_ref && 
                            !(notifications[i].type == 'rulesetvoteup' || notifications[i].type == 'rulesetvotedown')) {
                    notifications[i].targetUrl = "/analysts/" + notifications[i].analyst_ref.username;
                } else if (notifications[i].type == 'rulesetcomment' || notifications[i].type == 'socialaccepted' || 
                            notifications[i].type == 'socialrejected' || notifications[i].type == 'rulesetvoteup' || 
                            notifications[i].type == 'rulesetvotedown' || notifications[i].type == 'rulesetmention') {
                    notifications[i].targetUrl = "/rulesets/" + notifications[i].ruleset.id;
                }
            }
            $scope.notifications = notifications;
        });
    };
    $scope.getNotifications();

    $rootScope.getUnreadNotifications = function() {
        if (!$rootScope.user || !$rootScope.user.username){
            return false;
        }
        api.getUnreadNotifications().success(function(data) {
            if (data.next){
                $rootScope.favicon.badge(data.results.length + '+');
                $rootScope.unreadNotifications = data.results.length + '+';
            }
            else{
                $rootScope.unreadNotifications = data.results.length;
                $rootScope.favicon.badge(data.results.length);
            }
            
        });
    };

    // Temporarily disable notifications
    // $interval(function() {
    //     $rootScope.getUnreadNotifications();
    // }, 30000);

    $rootScope.getUnreadNotifications();

    $scope.markAsRead = function(notification) {
        notification.read = true;
        api.updateNotification(notification).success(function() {
            $scope.getUnreadNotifications();
        });
    };

    $rootScope.$watch('user', function() {
        if ($rootScope.user) {
            if ($rootScope.user.username) {
                $scope.userIsLoggedIn = true;
            } else {
                $scope.userIsLoggedIn = false;
            }
        }
    });

    $scope.logout = function() {
        delete localStorage.authToken;
        delete sessionStorage.authToken;
        $rootScope.user = {anon:true};
        // $location.path("/login");
    };

    // $scope.upload = function(file) {
    //     if (!file.length) {
    //         return false;
    //     }
    //     //Se calcula hash sha256 del fichero
    //     file = file[0];
    //     var reader = new FileReader();
    //     reader.onloadend = function() {
    //         var sha256 = sha256_digest(reader.result);
    //         $scope.sha256 = sha256;
    //         //Recuperar url de subida
    //         api.getAPKUploadUrl(sha256).success(function(data) {
    //             var upload_url = data.upload_url;

    //             if (data.upload_url) {
    //                 //Realizar upload
    //                 $scope.uploading = true;

    //                 $upload.upload({
    //                     url: upload_url,
    //                     method: 'POST',
    //                     file: file
    //                 }).progress(function(evt) {
    //                     console.log('progress: ' + parseInt(100.0 * evt.loaded / evt.total) + '% file :' + evt.config.file.name);
    //                     $scope.uploadProgress = parseInt(100.0 * evt.loaded / evt.total);
    //                 }).success(function(data, status, headers, config) {
    //                     // file is uploaded successfully
    //                     console.log('file ' + config.file.name + 'is uploaded successfully. Response: ' + data);
    //                     api.getAPK($scope.sha256).success(function(apk){
    //                         if(!apk.analyzed){
    //                             api.forzeApkAnalysis($scope.sha256).success(function(){
    //                                 $location.path("/apks/" + $scope.sha256);
    //                             });
    //                         }
    //                         else{
    //                             $location.path("/apks/" + $scope.sha256);
    //                         }
    //                     });
    //                 }).finally(function(){
    //                     $scope.uploading = false;
    //                 });
    //             }

    //         }).error(function(data, status, headers, config) {
    //             $scope.uploading = false;

    //             if (status == 409) {
    //                 //APK already exists
    //                 $location.path("/apks/" + $scope.sha256);
    //             } else {
    //                 alert('Error recuperando url de subida');
    //             }
    //         });
    //     };
    //     reader.readAsBinaryString(file);
    // };

    $scope.openFeedbackModal = function() {
        var modalInstance = $uibModal.open({
            templateUrl: '/app/feedback-modal.html?' + window.appVersion,
            controller: 'FeedbackModalController',
        });
    };

    $scope.openUploaderModal = function(){
        var modalInstance = $uibModal.open({
            templateUrl: '/app/uploader-modal.html',
            controller: 'NGUploaderController',
            backdropClass: 'fullscreen-modal',
            backdrop: 'static',
        });
    }
}]);

//Deprecated
app.controller('FeedbackModalController', ["$http", "$uibModalInstance", "$scope", function($http, $uibModalInstance, $scope) {
    $scope.msg = "";
    $scope.sending = false;
    $scope.sent = false;

    $scope.send = function() {
        $scope.sending = true;
        $http({
            method: 'POST',
            data: $.param({
                msg: $scope.msg
            }),
            url: '/feedback',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        }).finally(function() {
            $scope.sending = false;
            $scope.sent = true;
            setTimeout(function() {
                $uibModalInstance.close();
            }, 2000);
        });
    };
    $scope.cancel = function() {
        $uibModalInstance.close();
    };
}]);

app.controller('NGUploaderController', ["$scope", "$uibModalInstance", "api", "$upload", "$rootScope", function($scope, $uibModalInstance, api, $upload, $rootScope){
    $scope.currentStep = 1;
    $scope.existingApk = false;
    $scope.wrongMimeType = false;
    $scope.gettingAPKInfo = true;
    $scope.uploadError = false;
    $scope.uploadProgress = 0;
    $scope.gettingExpertDetections = true;
    $scope.expertDetections = false;
    $scope.gettingSocialDetections = true;
    $scope.socialDetections = false;
    $scope.socialDetectionsToolTip = "";
    $scope.expertDetectionsToolTip = "";

    $scope.apk = {};

    function getAPKInfo(sha256){
        if (!$scope.currentStep){
            //Modal has been closed
            return;
        }
        api.getAPK($scope.sha256).success(function(data){
            $scope.gettingAPKInfo = false;
            $scope.apk = data;
            if(!data.analyzed){
                setTimeout(function(){
                    getAPKInfo($scope.sha256);
                }, 10000);
            }
            else{
                api.getAPKDetections($scope.apk.sha256).success(function(data){
                    $scope.expertDetections = [];
                    for(var i = 0; i < data.length; i++){
                        var row = data[i];
                        
                        if (row.detected){
                            $scope.expertDetections.push(row);
                        }
                    }
                    $scope.gettingExpertDetections = false;
                });
                api.getAPKSocialDetections($scope.apk.sha256).success(function(data){
                    $scope.socialDetections = data;
                    $scope.gettingSocialDetections = false;
                });
                api.getAPKVotes($scope.sha256).success(function(data){
                    $scope.votesData = data;
                })
            }
        }).error(function(){
            setTimeout(function(){
                getAPKInfo($scope.sha256);
            }, 10000);
        });
    }
    
    $scope.upload = function(file) {
        if (!file.length) {
            return false;
        }
        $scope.checking_file = true;
        //Se calcula hash sha256 del fichero
        file = file[0];
        $scope.file = file;

        var reader = new FileReader();
        var reader2 = new FileReader();
        reader.onloadend = function(e) {
            var arr = (new Uint8Array(e.target.result)).subarray(0, 4);
            var header = "";
            for(var i = 0; i < arr.length; i++) {
                header += arr[i].toString(16);
            }

            if( header != "504b34"){
                $scope.uploadError = "The file you are trying to upload is not a valid APK";
                $scope.checking_file = false;
                $scope.currentStep = 1;
                $scope.uploading = false;
                return;
            }
            $scope.checking_file = false;
            $scope.currentStep = 2;
            reader2.readAsBinaryString($scope.file);
        };
        reader2.onloadend = function(e) {
            if(!$scope.uploadError){

            }
            
            var sha256 = sha256_digest(reader2.result);
            $scope.sha256 = sha256;
            //Recuperar url de subida

            api.getAPKUploadUrl(sha256).success(function(data) {
                var upload_url = data.upload_url;
                $scope.currentStep = 2;

                if (data.upload_url) {
                    $upload.upload({
                        url: upload_url,
                        method: 'POST',
                        file: file
                    }).progress(function(evt) {
                        // console.log('progress: ' + parseInt(100.0 * evt.loaded / evt.total) + '% file :' + evt.config.file.name);
                        $scope.uploadProgress = parseInt(100.0 * evt.loaded / evt.total);
                    }).success(function(data, status, headers, config) {
                        if(!$rootScope.user.anon){
                            api.forzeApkAnalysis($scope.sha256).success(function(){
                                // $location.path("/apks/" + $scope.sha256);
                            });
                        }
                        $scope.currentStep = 3;
                        setTimeout(function(){
                            getAPKInfo($scope.apk.sha256);
                        }, 3000);
                    }).error(function(data, status){
                        if(status == 415){
                            $scope.uploadError = "The file you are trying to upload is not a valid APK";
                        }
                    }).finally(function(){
                        $scope.uploading = false;
                    });
                }
            }).error(function(data, status, headers, config) {
                if (status == 409) {
                    //APK already exists
                    $scope.currentStep = 3;
                    setTimeout(function(){
                        getAPKInfo($scope.apk.sha256);
                    }, 5000);
                } 
                else {
                    $scope.uploadError = "Something wrong happened";
                }
            });
        };
        reader.readAsArrayBuffer(file);
    };

    $scope.close = function(){
        $uibModalInstance.close();
    }

    $scope.detail_apk = function(){
        document.location.href = "/apks/" + $scope.apk.sha256;
        $scope.close();
    }
}]);

app.controller('SidebarCtrl', ["$scope", "$rootScope", "api", "$location", function($scope, $rootScope, api, $location) {
    $scope.rulesets_shown = false;

    $(".rulesets-menu").hover(function(){
        var position = $(this).position().top + 55;
        $scope.main_ruleset_button_hover = true;
        $(".rulesets-sub-menu").stop().css("top",position + "px");
    },
    function(){
        $scope.main_ruleset_button_hover = false;
        setTimeout(function(){
            if(!$scope.sub_ruleset_button_hover && !$scope.main_ruleset_button_hover){
                $(".rulesets-sub-menu").stop().css("top","");
            }
        },100);
    });

    $(".rulesets-sub-menu").hover(function(){
        var position = $(".rulesets-menu").position().top + 55;
        $scope.sub_ruleset_button_hover = true;
        $(".rulesets-sub-menu").stop().css("top",position + "px");
    },
    function(){
        $scope.sub_ruleset_button_hover = false;
        setTimeout(function(){
            if(!$scope.sub_ruleset_button_hover && !$scope.main_ruleset_button_hover){
                $(".rulesets-sub-menu").stop().css("top","");
            }
        },100);
    });

    $(".rulesets-sub-menu").click(function(){
        $(".rulesets-sub-menu").stop().css("top","");
    });

    $scope.go = function(path) {
        $location.path(path);
    };
}]);

app.controller('StaticViewController', ["$scope", function($scope){
    $scope.press = [
        {
            title:"The Black Hat Arsenal Europe 2016 Line-Up !",
            link:"http://www.toolswatch.org/2016/09/the-black-hat-arsenal-europe-2016-line-up/#koodous",
            image:"http://www.toolswatch.org/wp-content/uploads/2016/07/bh16europe_logo_black_updated2.png",
            date:new Date(2016,8,14),
            media_logo: "/assets/img/blackhat.jpg",
        },
        {
            title:"Koodous: VirusTotal (antivirus social) para Android",
            link:"http://blog.elhacker.net/2016/09/koodous-virustotal-antivirus-social-para-android.html",
            image:"https://4.bp.blogspot.com/-JhUlSkhGJlk/V852vcIOqjI/AAAAAAAAiTs/1XJluMFTh8kg1JW8P8rlgACDAHYUfxLLwCLcB/s200/unnamed.png",
            date: new Date(2016,8,6),
            media_logo: "/assets/img/elhacker.png",
        },
        {
            title:"Una 'app' hecha en Málaga implica a expertos de todo el mundo para buscar virus en los móviles",
            link:"http://www.diariosur.es/tecnologia/empresas/201609/03/hecha-malaga-implica-expertos-20160903203659.html",
            image:"http://www.diariosur.es/noticias/201609/03/media/cortadas/hispaseCo0A5_QUAAEgLEv-k7KI-U202680318564uzH-575x323@Diario%20Sur.jpg",
            date: new Date(2016,8,4),
            media_logo: "/assets/img/diariosur.jpg",
        },
        {
            title:"Koodous es un antivirus que crece gracias a la comunidad",
            link:"http://www.xatakandroid.com/aplicaciones-android/koodous-es-un-antivirus-que-crece-gracias-a-la-comunidad",
            image:"http://i.blogs.es/12871b/koodous-trio/1366_2000.jpg",
            date:new Date(2016,7,18),
            media_logo: "/assets/img/xatakaandroid.jpeg",
        },
        {
            title:"Koodous, el antivirus social hecho entre todos",
            link:"http://tecnologia.elpais.com/tecnologia/2016/08/12/actualidad/1470986862_544707.html",
            image:"http://ep01.epimg.net/tecnologia/imagenes/2016/08/12/actualidad/1470986862_544707_1470989327_noticia_normal_recorte1.jpg",
            date:new Date(2016,7,18),
            media_logo: "/assets/img/elpais.png",
        },
        {
            title:"Koodous presente en BlackHat USA Las Vegas 2016",
            link:"http://unaaldia.hispasec.com/2016/08/koodous-presente-en-blackhat-usa-las.html",
            image:"https://3.bp.blogspot.com/-FGgOXL2HNJU/V6EgRb77NxI/AAAAAAAAHhE/q0L7PrRLFxYjvxFGNjdvv-8uCDyDYROsACLcB/s1600/blackhat2016.jpeg",
            date: new Date(2016,7,3),
            media_logo: "/assets/img/uad.png",
        },
        {
            title:"Clientes del BBVA, Santander y Ruralvía, en peligro por un virus en móviles Android",
            link:"http://www.elconfidencial.com/tecnologia/2016-03-13/clientes-del-bbva-santander-y-ruralvia-en-peligro-por-un-virus-en-moviles-android_1167402/",
            image:"http://9www.ecestaticos.com/imagestatic/clipping/dda/bc9/4f8/ddabc94f8ea79f24d32bb48cf9d1df9a/clientes-del-bbva-santander-y-ruralvia-en-peligro-por-un-virus-en-moviles-android.jpg?mtime=1457719422",
            date: new Date(2016,2,13),
            media_logo: "/assets/img/elconfidencial.png",
        },
        {
            title:"Repaso al 2015. Koodous awakens :)",
            link:"http://unaaldia.hispasec.com/2016/01/repaso-al-2015-koodous-awakens.html",
            image:"http://4.bp.blogspot.com/-9cGFulpUrlo/Vo6ypxQ2wSI/AAAAAAAAFwU/QnJSv5rBYQM/s1600/Koodous_strings.png",
            date: new Date(2016,0,8),
            media_logo: "/assets/img/uad.png",
        },
        {
            title:"Koodous alcanza el millón de aplicaciones Android fraudulentas detectadas",
            link:"http://unaaldia.hispasec.com/2015/10/koodous-alcanza-el-millon-de.html",
            image:"http://4.bp.blogspot.com/-iZ0oxogoPWE/Vh5jppPm_wI/AAAAAAAAE7A/i5fPBHbQMiQ/s1600/Koodous_1.png",
            date: new Date(2015,9,14),
            media_logo: "/assets/img/uad.png",
        },
        {
            title:"Koodous: inteligencia colectiva para proteger tu Android",
            link:"http://unaaldia.hispasec.com/2015/07/koodous-inteligencia-colectiva-para.html",
            image:"http://3.bp.blogspot.com/-UAc_TY1HrnE/VYvlCYEcsdI/AAAAAAAAD4c/J8wHv2u47eA/s640/diagram-koodous.png",
            date: new Date(2015,6,6),
            media_logo: "/assets/img/uad.png",
        }
    ];
}]);