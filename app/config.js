angular.module('app')
.config(["$httpProvider", "$compileProvider", function ($httpProvider, $compileProvider) {
    $httpProvider.interceptors.push(["$q", "$rootScope", "$injector", function ($q, $rootScope, $injector) {
        //Peticiones que no requieren autenticación
        var excludeAuthUrls = [
            window.base_api_url + "/get_auth_token",
            window.base_api_url + "/register",
        ];
        
        var intervalRef;
        $rootScope.tooManyRequests = false;

        return {
            'request': function (config) {
                /**
                * Controla el envío del token de autenticación a la API
                **/

                //Incluir token de autenticación en todas las peticiones 
                //excepto en las peticiones excluidas.
                if (excludeAuthUrls.indexOf(config.url) == -1)
                {
                    var token = sessionStorage.authToken ? sessionStorage.authToken : localStorage.authToken;
                    if(token){
                        config.headers.Authorization = 'Token ' + token;
                    }
                }
                return config || $q.when(config);

            },
            // 'responseError': function(rejection){
            //     /**
            //     * Manejador de errores globales
            //     **/
            //     if (rejection.status == 429){
            //         $rootScope.tooManyRequests = true;
            //         $rootScope.secondsToWait = 0;
            //
            //         //Extract seconds to wait
            //         try{
            //             var patt = new RegExp(/\d{1,2}/);
            //             console.log('Rejection', rejection);
            //             $rootScope.secondsToWait = patt.exec(rejection.data.detail)[0];
            //         }
            //         catch(e){
            //             console.log(e);
            //         }
            //     }
            //     return $q.reject(rejection);
            // }
        };
    }]);
    $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|tel|file|blob):/);
}]);