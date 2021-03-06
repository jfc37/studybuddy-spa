(function () {
    'use strict';

    angular
        .module('app.core')
        .factory('authService', authService);

    authService.$inject = ['$q', '$http', '$cookieStore', 'base64Service', 'dataservice'];

    /* @ngInject */
    function authService($q, $http, $cookieStore, base64Service, dataservice){

        var userIdentity = {
            isLoggedIn: false
        };

        var service = {
            login: login,
            logout: logout,
            getUserIdentity: getUserIdentity,
            setUserIdentityProperty: setUserIdentityProperty
        };
        init();
        return service;

        function init() {
            var userCookie = $cookieStore.get('authuser');
            if (userCookie !== undefined){
                userIdentity = userCookie;
            }
            var authDataCookie = $cookieStore.get('authdata');
            if (authDataCookie !== undefined){
                addBasicAuthorisation(authDataCookie);
            }

        }

        function getUserIdentity() {
            return userIdentity;
        }

        function setUserIdentityProperty(propertyName, propertyValue) {
            userIdentity[propertyName] = propertyValue;
            $cookieStore.put('authuser', userIdentity);
        }

        function login(username, password) {
            var encoded = base64Service.encode(username + ':' + password);
            addBasicAuthorisation(encoded);

            return $q(function (resolve, revoke) {
                dataservice.searchForUser({username: username}).then(function (response) {
                    userIdentity.isLoggedIn = true;
                    userIdentity.username = username;
                    var user = response.data[0];
                    userIdentity.userId = user.id;
                    var person = user.person;
                    if (person !== undefined && person !== null) {
                        userIdentity.role = person.role.toLowerCase();
                        userIdentity.personId = person.id;
                    }

                    $cookieStore.put('authdata', encoded);
                    $cookieStore.put('authuser', userIdentity);

                    resolve();
                }, function(response){
                    logout();
                    if (response.status === 401){
                        revoke([{property_name: "global", error_message: "Invalid username or password"}]);
                    }
                });
            });
        }

        function addBasicAuthorisation(encoded) {
            $http.defaults.headers.common.Authorization = 'Basic ' + encoded;
        }

        function logout() {
            document.execCommand("ClearAuthenticationCache");
            $cookieStore.remove('authdata');
            $cookieStore.remove('authuser');
            $http.defaults.headers.common.Authorization = 'Basic ';

            userIdentity = {
                isLoggedIn: false
            };
        }

    }
})();