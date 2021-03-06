(function () {
    'use strict';

    angular
        .module('blocks.router')
        .provider('routehelperConfig', routehelperConfig)
        .factory('routehelper', routehelper);

    routehelper.$inject = ['$location', '$rootScope', '$route', 'logger', 'routehelperConfig', 'authService'];

    // Must configure via the routehelperConfigProvider
    function routehelperConfig () {
        /* jshint validthis:true */
        this.config = {
            // These are the properties we need to set
            // $routeProvider: undefined
            // docTitle: ''
            // resolveAlways: {ready: function(){ } }
        };

        this.$get = function () {
            return {
                config: this.config
            };
        };
    }

    function routehelper($location, $rootScope, $route, logger, routehelperConfig, authService) {
        var handlingRouteChangeError = false;
        var routeCounts = {
            errors: 0,
            changes: 0
        };
        var routes = [];
        var $routeProvider = routehelperConfig.config.$routeProvider;
        var getUserIdentity = authService.getUserIdentity;

        var service = {
            configureRoutes: configureRoutes,
            getRoutes: getRoutes,
            routeCounts: routeCounts,
            redirectToRoute: redirectToRoute,
            getRouteFromName: getRouteFromName
        };

        init(authService.getUserIdentity);

        return service;
        ///////////////

        function configureRoutes(routes){
            routes.forEach(function (route) {
                route.config.resolve =
                    angular.extend(route.config.resolve || {}, routehelperConfig.config.resolveAlways);
                $routeProvider.when(route.url, route.config);
            });
            $routeProvider.otherwise({ redirectTo: '/login' });
        }

        function handleRoutingErrors() {
            // Route cancellation:
            // On routing error, go to the dashboard.
            // Provide an exit clause if it tries to do it twice.
            $rootScope.$on('$routeChangeError',
                function (event, current, previous, rejection) {
                    if (handlingRouteChangeError) {
                        return;
                    }
                    routeCounts.errors++;
                    handlingRouteChangeError = true;
                    var destination = (current && (current.title || current.name || current.loadedTemplateUrl)) ||
                        'unknown target';
                    var msg = 'Error routing to ' + destination + '. ' + (rejection.msg || '');
                    logger.warning(msg, [current]);
                    $location.path('/');
                }
            );
        }

        function handleRoutingAuthorisation(getUserIdentity) {
            $rootScope.$on('$routeChangeStart',
                function (event, current, previous, rejection) {
                    if (current.$$route === undefined) {
                        logger.warning('Page not found');
                        redirectToRoute(getDefaultRoute());
                    }

                    if (!isAuthorisedForRoute(current.$$route)) {
                        event.preventDefault();
                        logger.warning('Unauthorised to visit page');
                        redirectToRoute(getDefaultRoute());
                    }
                }
            );
        }

        function init(getUserIdentity) {
            handleRoutingErrors();
            handleRoutingAuthorisation(getUserIdentity);
            updateDocTitle();
        }

        function getRoutes() {
            if (routes.length < 1) {
                for (var prop in $route.routes) {
                    if ($route.routes.hasOwnProperty(prop)) {
                        var route = $route.routes[prop];
                        var isRoute = !!route.title;
                        if (isRoute) {
                            routes.push(route);
                        }
                    }
                }
            }

            var userIdentity = getUserIdentity();
            var isUnregisteredPerson = userIdentity.role === undefined;
            var isStudent = userIdentity.role === 'student';
            var isProfessor = userIdentity.role === 'professor';

            return routes.filter(isAuthorisedForRoute);
        }

        function updateDocTitle() {
            $rootScope.$on('$routeChangeSuccess',
                function (event, current, previous) {
                    routeCounts.changes++;
                    handlingRouteChangeError = false;
                    var title = routehelperConfig.config.docTitle + ' ' + (current.title || '');
                    $rootScope.title = title; // data bind to <title>
                }
            );
        }

        function redirectToRoute(routeName, routeParameters){
            var routePath = getRouteFromName(routeName, routeParameters);
            if (window.location.pathname.indexOf('#') < 0) {
                window.location = '/#' + routePath;
            } else {
                $location.path(routePath);
            }
        }

        function getRouteFromName(routeName, routeParameters){
            var routes = getRoutes().filter(function(route){ 
                return route.title === routeName;
            });

            if (routes.length < 1){
                logger.error("Failed to find matching route", routeName, "No matching route");
                return "";
            } else {
                var route = routes[0];
                var routePath = route.originalPath;
                if (routeParameters !== undefined && routeParameters !== null) {
                    for (var prop in routeParameters) {
                        if (routeParameters.hasOwnProperty(prop)) {
                            routePath = routePath.replace(":" + prop, routeParameters[prop]);
                        }
                    }
                }

                return routePath;
            }
        }

        /*private*/
        function isAuthorisedForRoute(route) {
            var userIdentity = getUserIdentity();
            var isUnregisteredPerson = userIdentity.role === undefined;
            var isStudent = !isUnregisteredPerson && userIdentity.role.toLowerCase() === 'student';
            var isProfessor = !isUnregisteredPerson && userIdentity.role.toLowerCase() === 'professor';

            var isAuthorised = true;
            if (!userIdentity.isLoggedIn) {
                if (!route.allowAnonymous){
                    isAuthorised = false;
                }
             } else if (route.denyAuthorised){
                    isAuthorised = false;
            } else if (!route.allowUnregisteredPerson && isUnregisteredPerson){
                    isAuthorised = false;
            } else if (route.denyRegisteredPerson && !isUnregisteredPerson){
                    isAuthorised = false;
            } else if (route.denyStudent && isStudent){
                    isAuthorised = false;
            }
            return isAuthorised;
        }

        function getDefaultRoute() {
            var userIdentity = getUserIdentity();
            var isUnregisteredPerson = userIdentity.role === undefined;

            var defaultRoute = 'dashboard';
            if (!userIdentity.isLoggedIn) {
                defaultRoute = 'login';
            } else if (isUnregisteredPerson) {
                defaultRoute = 'registerPerson';
            }

            return defaultRoute;
        }

        /*/private*/
    }
})();