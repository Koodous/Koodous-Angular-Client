angular.module('apks', ['ui.bootstrap', 'ngSanitize']);

angular.module('apks').controller('APKsCtrl', ["$scope", "$rootScope", "api", "$location", "$stateParams", "$state", function ($scope, $rootScope, api, $location, $stateParams, $state) {
    $scope.apks = [];
    $rootScope.section = "apks";
    $scope.showFilters = false;
    $scope.filters = {
        analyzed: $stateParams.analyzed ? $stateParams.analyzed : '',
        repo: $stateParams.repo ? $stateParams.repo : ''
    };
    $rootScope.search = $stateParams.search ? $stateParams.search : '';
    $scope.nextPage = false;

    $scope.$watch('filters', function (newVal, oldVal) {
        $scope.filters.search = $rootScope.search;
        if (!$scope.loading) {
            $scope.getAPKS();
        }
    }, true);

    //Loading on scroll
    $(window).scroll(function () {
        if ($(window).scrollTop() + $(window).height() == $(document).height()) {
            if (!$scope.loading && $scope.nextPage) {
                $scope.getAPKS();
            }
        }
    });
    $scope.$on("$destroy", function (event) {
        $(window).unbind("scroll");
    });

    $scope.getAPKS = function () {
        $scope.loading = true;
        $scope.searchError = false;
        var filters = $scope.filters;

        function processResponse(data) {
            $scope.totalApks = data.count;
            $scope.nextPage = data.next;
            if (filters && (filters.sha256 || filters.sha1 || filters.md5)) {
                if (data.results.length) {
                    $location.path("/apks/" + data.results[0].sha256);
                }
                else {
                    $scope.apks = $scope.apks.concat(data.results);
                }
            }
            else {
                $scope.apks = $scope.apks.concat(data.results);
            }
        }

        //Ruleset apk detections
        if ($stateParams.ruleset_id) {
            api.getRulesetDetections($stateParams.ruleset_id, $scope.nextPage, filters).success(processResponse).error(function (data) {
                $scope.searchError = data.error;
                $scope.apks = [];
            }).finally(function () {
                $scope.loading = false;
            });
        }
        //Mobile apks installed
        else if ($stateParams.android_id) {
            api.getDeviceAPKs($stateParams.android_id, $scope.nextPage, filters).success(processResponse).error(function (data) {
                $scope.searchError = data.error;
                $scope.apks = [];
                $scope.totalItems = 0;
            }).finally(function () {
                $scope.loading = false;
            });
        }
        //Regular APK section
        else {
            api.getAPKs($scope.nextPage, filters).success(processResponse).error(function (data) {
                $scope.searchError = data.error;
                $scope.apks = [];
            }).finally(function () {
                $scope.loading = false;
            });
        }
    };
    $scope.searchApks = function () {
        //Replace # for tag:
        $rootScope.search = $rootScope.search.replace(/#/g, "tag:");

        $state.go($state.current.name, {search: $rootScope.search});
    };
    $scope.voteUp = function (apk) {
        api.voteAPK(apk.sha256, 'positive').success(function (data) {
            apk.rating += 1;
        }).error(function (data) {
            if (status_code == 401) {
                $location.path("/login");
            }
        });
    };
    $scope.voteDown = function (apk) {
        api.voteAPK(apk.sha256, 'negative').success(function (data) {
            apk.rating -= 1;
        }).error(function (data, status_code) {
            if (status_code == 401) {
                $location.path("/login");
            }
        });
    };
}]);

angular.module('app').filter('prettify', function () {
    function syntaxHighlight(json) {
        json = json ? json : "";
        json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
            var cls = 'number';
            if (/^"/.test(match)) {
                if (/:$/.test(match)) {
                    cls = 'key';
                } else {
                    cls = 'string';
                }
            } else if (/true|false/.test(match)) {
                cls = 'boolean';
            } else if (/null/.test(match)) {
                cls = 'null';
            }
            return '<span class="' + cls + '">' + match + '</span>';
        });
    }

    return syntaxHighlight;
});

angular.module('apks').controller('APKDetailCtrl', ["$scope", "$rootScope", "api", "$stateParams", "$location", "$uibModal", function ($scope, $rootScope, api, $stateParams, $location, $uibModal) {
    $scope.apk = false;
    $rootScope.section = "apks";
    $scope.subsection = 'main';
    $scope.Object = Object;

    //Remove all posible search params
    for (var property in $location.$$search) {
        $location.search(property, null);
    }

    $scope.getApk = function () {
        api.getAPK($stateParams.sha256).success(function (data) {
            var analysisbk = false;
            if ($scope.apk) {
                analysisbk = $scope.apk.analysis;
            }
            else {
                analysisbk = false;
            }
            $scope.apk = data;
            $scope.apk.analysis = analysisbk;

            // Defaults visual conf
            $scope.apk.show_detections = false;
            $scope.apk.show_votes = false;
            $scope.apk.show_avs = false;
            $scope.apk.show_engines = false;

            $scope.getDetections();
            $scope.getVotes();
            $scope.getAVScans();
            $scope.getMi3Report();
        }).error(function () {
            $location.url("/apks");
        });
    };
    $scope.getApk();

    $scope.download = function () {
        var sha256 = $stateParams.sha256;
        api.downloadAPK(sha256)
            .then(function (response) {
                if (response.data.download_url) {
                    document.location.href = response.data.download_url;
                }
                else {
                    alert("No hay url de descarga");
                }
            })
            .catch(function (response) {
                $scope.openLimitReachedModal();
            });
    };

    $scope.openLimitReachedModal = function () {
        var modalInstance = $uibModal.open({
            templateUrl: '/app/limit-reached-modal.html?' + window.appVersion,
            controller: 'LimitReachedModalController',
        });
    };

    $scope.analyze = function () {
        $scope.analyzing = true;
        api.forzeApkAnalysis($scope.apk.sha256).success(function (response) {
            $scope.analysisRequested = true;
        }).error(function (response) {
            $scope.analysisRequestedFailed = true;
        }).finally(function () {
            $scope.analyzing = false;
        });
    };

    $scope.getDetections = function () {
        api.getAPKDetections($stateParams.sha256).success(function (response) {
            $scope.apk.detections = response;
            $scope.apk.total_detections = 0;
            for (var i = 0; i < response.length; i++) {
                if (response[i].detected) {
                    $scope.apk.total_detections++;
                }
            }

            if ($scope.apk.analyzed) {
                $scope.apk.show_detections = true;
            }
        });
    };
    $scope.getVotes = function () {
        api.getAPKVotes($stateParams.sha256, 1, 25).success(function (response) {
            $scope.apk.votes = response;
            if (response.results.length > 0) {
                $scope.apk.show_votes = true;
            }
        });
    };
    $scope.setAPKAsTrusted = function () {
        api.updateAPK($stateParams.sha256, {trusted: true, detected: false}).success(function (response) {
            $scope.apk.trusted = true;
            $scope.apk.detected = false;
            $scope.getApk();
        });
    };
    $scope.getAVScans = function () {
        api.getAPKAVScans($stateParams.sha256).success(function (response) {
            $scope.apk.av_scans = response;
            if ($scope.apk.av_scans.length == 0) {
                $scope.apk.av_scans = [{total_detections: 0, results: []}];
                $scope.apk.show_avs = false;
            }
            else {
                $scope.apk.show_avs = true;
            }
        });
    }
    $scope.getMi3Report = function () {
        api.getAPKMi3Report($stateParams.sha256).success(function (response) {
            $scope.apk.mi3_report = response;
            $scope.apk.show_engines = true;
        });
    }
}]);
angular.module('apks').controller('APKRatingCtrl', ["$scope", "api", "$stateParams", function ($scope, api, $stateParams) {
    $scope.sha256 = $stateParams.sha256;

    $scope.userVoted = false;
    $scope.userVote = null;

    //Figure out if current user already vote this apk
    $scope.getUserVote = function () {
        api.getUserApkVote($scope.sha256).success(function (response) {
            $scope.userVoted = true;
            $scope.userVote = response;
        }).error(function () {
            $scope.userVoted = false;
        });
    };
    $scope.getUserVote();

    $scope.voteUp = function () {
        //Simulate vote
        $scope.userVoted = true;
        $scope.userVote = {kind: 'positive'};
        $scope.$parent.apk.rating = $scope.$parent.apk.rating + 1;

        api.voteAPK($scope.sha256, 'positive').success(function (data) {
        });
    };

    $scope.voteDown = function () {
        //Simulate vote
        $scope.userVoted = true;
        $scope.userVote = {kind: 'negative'};
        $scope.$parent.apk.rating = $scope.$parent.apk.rating - 1;

        api.voteAPK($scope.sha256, 'negative').success(function (data) {
        });
    };
}]);
angular.module('apks').controller('APKMainController', ["$scope", "$rootScope", "api", "$stateParams", "$location", function ($scope, $rootScope, api, $stateParams, $location) {
    $scope.$parent.subsection = 'main';
}]);
angular.module('apks').controller('APKCommentsController', ["$scope", "$rootScope", "api", "$stateParams", function ($scope, $rootScope, api, $stateParams) {
    $scope.$parent.subsection = 'comments';
    $scope.sha256 = $stateParams.sha256;
    $scope.comments = [];
    $scope.newComment = {};
    $scope.nextPage = false;

    $scope.pageChanged = function () {
        $scope.getComments();
    };
    $scope.getComments = function () {
        api.getAPKComments($scope.sha256, $scope.nextPage).success(function (data) {
            $scope.nextPage = data.next;
            $scope.comments = $scope.comments.concat(data.results);
        });
    };
    $scope.deleteComment = function (comment) {
        if (confirm("Are you sure?")) {
            api.deleteComment(comment).success(function () {
                for (var i in $scope.comments) {
                    if (comment.id == $scope.comments[i].id) {
                        $scope.comments.splice(i, 1);
                        break;
                    }
                }
            });
        }
    };
    $scope.updateComment = function (comment) {
        comment.text = comment.newtext;
        api.updateComment(comment);
        comment.editing = false;
    };
    $scope.addComment = function () {
        api.addAPKComment($scope.sha256, $scope.newComment)
            .success(function (data) {
                $scope.comments.push(
                    {
                        author: $rootScope.user,
                        created_on: Math.floor(Date.now() / 1000),
                        modified_on: Math.floor(Date.now() / 1000),
                        text: data.text
                    }
                );

                api.getAPK($stateParams.sha256).success(function (data) {
                    $scope.$parent.apk.tags = data.tags;
                });
            })
            .error(function (data, statusCode) {
                //TODO: Alertar
            });

        $scope.newComment = {};
    };
    $scope.getComments();
}]);
angular.module('apks').controller('APKAnalysisController', ["$scope", "api", "$stateParams", function ($scope, api, $stateParams) {
    $scope.$parent.subsection = 'analysis';
    $scope.gettingAnalysis = false;
    $scope.gettingStrings = false;
    $scope.strings = "";
    $scope.stringsFilter = "";

    $scope.totalStrings = 0;
    $scope.stringsPerPage = 100;
    $scope.currentStringsPage = 1;

    $scope.getApkAnalysis = function () {
        $scope.gettingAnalysis = true;
        $scope.limitReached = false;
        api.getApkAnalysis($stateParams.sha256, true)
            .then(function (response) {

                //Download analysis url
                var content = JSON.stringify(response.data, undefined, 4);
                var blob = new Blob([content], {type: 'text/plain'});
                $scope.downloadUrl = (window.URL || window.webkitURL).createObjectURL(blob);

                //Remove status, sha256 and scanning_date
                delete response.data.status;
                delete response.data.sha256;
                delete response.data.scanning_date;

                $scope.$parent.apk.analysis = response.data;

                $scope.$parent.apk.analysis_json = JSON.stringify(response.data, undefined, 4);

            })
            .catch(function (response) {
                if (response.status == 429) {
                    $scope.limitReached = true;
                }
            })
            .finally(function () {
                $scope.gettingAnalysis = false;
            });
    };
    $scope.getApkAnalysis();
    $scope.getApkStrings = function () {
        $scope.gettingStrings = true;
        api.getApkStrings($stateParams.sha256, $scope.currentStringsPage, $scope.stringsPerPage = 100, {search: $scope.stringsFilter})
            .success(function (response) {
                $scope.strings = response.strings;
                $scope.totalStrings = response.count;
            }).finally(function () {
            $scope.gettingStrings = false;
        });
    };
    $scope.stringsPageChanged = function () {
        $scope.getApkStrings();
    };
    $scope.filterStrings = function () {
        $scope.currentStringsPage = 1;
        $scope.getApkStrings();
    }
}]);
angular.module('apks').controller('APKMetadataController', ["$scope", "api", "$stateParams", function ($scope, api, $stateParams) {
    $scope.$parent.subsection = 'metadata';
    $scope.getApkMetadata = function () {
        if (!$scope.$parent.apk.metadata) {
            api.getApkMetadata($scope.apk.sha256, true).success(function (response) {
                $scope.apk.metadata = JSON.stringify(response, undefined, 4);
            });
        }
        else {
            $scope.$parent.$watch('apk', function () {
                if ($scope.$parent.apk) {
                    $scope.getApkMetadata();
                }
            }, true);
        }
    };
    $scope.getApkMetadata();
}]);