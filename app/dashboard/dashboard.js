angular.module('dashboard', []);

angular.module('dashboard').controller('DashboardCtrl', ["$scope", "$rootScope", "api", "$interval", "$location", "$timeout", function($scope, $rootScope, api, $interval, $location, $timeout) {

	function pad(n, width, z) {
		z = z || '0';
		n = n + '';
		return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
	}

	$rootScope.section = "dashboard";
	$rootScope.activityType = "user-timeline";
	// $rootScope.totalAPKDetected = window.totalAPKDetected;
	// $rootScope.last24hApks = window.last24hUploads;
	// $rootScope.totalAPKs = window.totalAPKs;
	// $rootScope.totalSocialRulesets = window.totalSocialRulesets;
	$rootScope.activity_loading = true;

	//Total APKs últimas 24h
	var d = new Date();
	d.setDate(d.getDate()-1);
	var timestamp = parseInt(d.getTime()/1000);

	//Timeline
	$scope.getActivity = function(){
		//Last 24 hours uploads
		api.getAPKs(false, {search:"created_on:>now-1d"}).success(function(response){
			$rootScope.last24hApks = response.count;
		});

		//Detections
		api.getAPKs(false, {search:"detected:true"}).success(function(response){
			$rootScope.totalAPKDetected = response.count;
		});

		//Social rulesets
		api.getPublicRulesets(1, false, {social:"True"}).success(function(response){
			$rootScope.totalSocialRulesets = response.count;
		});

		//Potential malware
		api.getAPKs(false, {search:"detected:0 AND rating:\"-1\""}).success(function(response){
			$rootScope.potentialMalware = response.count;
		});

		function getGlobalActivity(){
			$scope.activity_loading = true;
			api.getGlobalActivity().success(function(response){
				$scope.activity = response.results.slice(0,9);
			}).finally(function(){
				$scope.activity_loading = false;
			});
		}
		function getTimelineActivity(){
			$scope.activity_loading = true;
			api.getAnalystTimeline($rootScope.user.username).success(function(response){
				$scope.activity = response.results.slice(0,9);
				if(response.results.length == 0){
					$scope.activityType == 'global-timeline';
					getGlobalActivity();
				}
			}).finally(function(){
				$scope.activity_loading = false;
			});
		}

		if(!$rootScope.user){
			setTimeout(function(){
				$scope.getActivity();
			}, 500);
			return false;
		}

		if($scope.activityType == 'user-timeline'){
			getTimelineActivity();
		}
		else if($scope.activityType == 'global-timeline'){
			getGlobalActivity();
		}
	}
	$scope.$watch('activityType', function(newValue, oldValue){
		if(newValue != oldValue){
			$scope.activity = [];
		}
		$scope.getActivity();
	});

	//Interval & timeout logic
	// $rootScope.getActivity();
	var getActivityInterval = $interval($scope.getActivity, 10000);
	$scope.$on("$destroy", function(event){
		$interval.cancel(getActivityInterval);
	});
	//Cancel interval after 2 minutes
	$timeout(function(){
		try{
			$interval.cancel(getActivityInterval);
		}
		catch(e){}
	}, 120000);

	$rootScope.$watch("user", function(newValue, oldValue){
		if($rootScope.user && $rootScope.user.anon){
			$rootScope.activityType = "global-timeline";
			try{
				$interval.cancel(getActivityInterval);
			}
			catch(e){}
		}
		else{
			if ($rootScope.user && $rootScope.user.followers > 0){
				$rootScope.activityType = "user-timeline";
			}
			else{
				$rootScope.activityType = "global-timeline";
			}
			try{
				$interval.cancel(getActivityInterval);
			}
			catch(e){}
		}
	}, true);

	$scope.go = function (path, search){
		search = search ? search : null;
		$location.path(path).search('search',search);
	};
	$scope.go24HoursUploads = function(){
		var ts = Math.round(new Date().getTime() / 1000);
		var tsYesterday = ts - (24 * 3600);
		$location.path('/apks')
	}
}]);

angular.module('dashboard').controller('LastApksCtrl', ["$scope", "$rootScope", "api", "$interval", "$timeout", function($scope, $rootScope, api, $interval, $timeout){
	//Se cogen los últimos APKs
	function getApks(){
		$scope.loading = true;
		api.getAPKs().success(function(data){
			$scope.apks = data.results.slice(0,8);
			$rootScope.totalAPKs = data.count;
		}).finally(function(){
			$scope.loading = false;
		});
	}
	var latestApksInterval = $interval(getApks, 15000);
	$scope.$on("$destroy", function(event){
		$interval.cancel(latestApksInterval);
	});
	//Cancel interval after 5 minutes
	$timeout(function(){
		try{
			$interval.cancel(latestApksInterval);
		}
		catch(e){}
	}, 300000);
	$rootScope.$watch("user", function(){
		if($rootScope.user && $rootScope.user.anon){
			$rootScope.activityType = "global-timeline";
			try{
				$interval.cancel(latestApksInterval);
			}
			catch(e){}
		}
		else{
			$rootScope.activityType = "user-timeline";
		}
	}, true);
	getApks();
}]);

angular.module('dashboard').controller('LatestAnalystsController', ["$scope", "api", function($scope, api){
	api.getLatestAnalysts().success(function(data){
		$scope.latest_analysts = data.slice(0,3);
	});
}]);

angular.module('dashboard').controller('TrendingAnalystsController', ["$scope", "$rootScope", "api", "$interval", "$timeout", function($scope, $rootScope, api, $interval, $timeout){
	api.getTrendingAnalysts().success(function(data){
		$scope.trending_analysts = data.slice(0,8);
	});
}]);
