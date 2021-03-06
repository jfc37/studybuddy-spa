(function () {
    'use strict';

    angular
        .module('app.manageCourse')
        .factory('manageCourseService', manageCourseService);

    manageCourseService.$inject = ['$q', '$routeParams', 'dataservice', 'dataUpdateService', 'dataDeleteService', 'logger'];

    /* @ngInject */
    function manageCourseService($q, $routeParams, dataservice, dataUpdateService, dataDeleteService, logger) {
        /*jshint validthis: true */
        var service = {
            getCourse: getCourse,
            updateCourseDetails: updateCourseDetails,
        };

        function getCourse(courseName) {
            return $q(function (resolve, revoke) {
                dataservice.searchForCourse({name: courseName}, {assignments: true, exams: true, lectures: true, notices: true}).then(function (courses) {
                    return resolve(courses[0]);
                }, revoke);
            });
        }

        function updateCourseDetails(course) {
            return $q(function (resolve, revoke) {
                dataUpdateService.updateCourse(course).then(resolve, function (response) {
                    if (response.validation_result !== undefined){
                        revoke(response.validation_result.validation_errors);
                    } else {
                        revoke();   
                    }
                });
            });
        }

        return service;
    }
})();