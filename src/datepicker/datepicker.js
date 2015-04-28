

angular.module('ui.bootstrap.datepicker', ['ui.bootstrap.position'])

.constant('datepickerConfig', {
  dayFormat: 'dd',
  monthFormat: 'MMMM',
  yearFormat: 'yyyy',
  dayHeaderFormat: 'EEE',
  dayTitleFormat: 'MMMM yyyy',
  monthTitleFormat: 'yyyy',
  showWeeks: true,
  startingDay: 0,
  yearRange: 20,
  minDate: null,
  maxDate: null,
  defaultViewDate: null  
})

.controller('DatepickerController', ['$scope', '$attrs', 'dateFilter', 'datepickerConfig', function($scope, $attrs, dateFilter, dtConfig) {
  var format = {
    day:        getValue($attrs.dayFormat,        dtConfig.dayFormat),
    month:      getValue($attrs.monthFormat,      dtConfig.monthFormat),
    year:       getValue($attrs.yearFormat,       dtConfig.yearFormat),
    dayHeader:  getValue($attrs.dayHeaderFormat,  dtConfig.dayHeaderFormat),
    dayTitle:   getValue($attrs.dayTitleFormat,   dtConfig.dayTitleFormat),
    monthTitle: getValue($attrs.monthTitleFormat, dtConfig.monthTitleFormat)
  },
  startingDay = getValue($attrs.startingDay,      dtConfig.startingDay),
  yearRange =   getValue($attrs.yearRange,        dtConfig.yearRange);

  this.minDate = dtConfig.minDate ? new Date(dtConfig.minDate) : null;
  this.maxDate = dtConfig.maxDate ? new Date(dtConfig.maxDate) : null;

  this.skipCalendarOnTab = $scope.$eval($attrs.skipCalendarOnTab);

  function getValue(value, defaultValue) {
    return angular.isDefined(value) ? $scope.$parent.$eval(value) : defaultValue;
  }

  function getDaysInMonth( year, month ) {
    return new Date(year, month, 0).getDate();
  }

  function getDates(startDate, n) {
    var dates = new Array(n);
    var current = startDate, i = 0;
    while (i < n) {
      dates[i++] = new Date(current);
      current.setDate( current.getDate() + 1 );
    }
    return dates;
  }

  function makeDate(date, format, isSelected, isSecondary) {
    var todayDateString = new Date().toDateString();
    return { date: date, label: dateFilter(date, format), selected: !!isSelected, secondary: !!isSecondary, isToday: date.toDateString() == todayDateString };
  }

  this.modes = [
    {
      name: 'day',
      getVisibleDates: function(date, selected) {
        var year = date.getFullYear(), month = date.getMonth(), firstDayOfMonth = new Date(year, month, 1);
        var difference = startingDay - firstDayOfMonth.getDay(),
        numDisplayedFromPreviousMonth = (difference > 0) ? 7 - difference : - difference,
        firstDate = new Date(firstDayOfMonth), numDates = 0;

        if ( numDisplayedFromPreviousMonth > 0 ) {
          firstDate.setDate( - numDisplayedFromPreviousMonth + 1 );
          numDates += numDisplayedFromPreviousMonth; // Previous
        }
        numDates += getDaysInMonth(year, month + 1); // Current
        numDates += (7 - numDates % 7) % 7; // Next

        var days = getDates(firstDate, numDates), labels = new Array(7);
        for (var i = 0; i < numDates; i ++) {
          var dt = new Date(days[i]);
          days[i] = makeDate(dt, format.day, (selected && selected.getDate() === dt.getDate() && selected.getMonth() === dt.getMonth() && selected.getFullYear() === dt.getFullYear()), dt.getMonth() !== month);
        }
        for (var j = 0; j < 7; j++) {
          labels[j] = dateFilter(days[j].date, format.dayHeader);
        }
        return { objects: days, title: dateFilter(date, format.dayTitle), labels: labels };
      },
      compare: function(date1, date2) {
        return (new Date( date1.getFullYear(), date1.getMonth(), date1.getDate() ) - new Date( date2.getFullYear(), date2.getMonth(), date2.getDate() ) );
      },
      split: 7,
      step: { months: 1 }
    },
    {
      name: 'month',
      getVisibleDates: function(date, selected) {
        var months = new Array(12), year = date.getFullYear();
        for ( var i = 0; i < 12; i++ ) {
          var dt = new Date(year, i, 1);
          months[i] = makeDate(dt, format.month, (selected && selected.getMonth() === i && selected.getFullYear() === year));
        }
        return { objects: months, title: dateFilter(date, format.monthTitle) };
      },
      compare: function(date1, date2) {
        return new Date( date1.getFullYear(), date1.getMonth() ) - new Date( date2.getFullYear(), date2.getMonth() );
      },
      split: 3,
      step: { years: 1 }
    },
    {
      name: 'year',
      getVisibleDates: function(date, selected) {
        var years = new Array(yearRange), year = date.getFullYear(), startYear = parseInt((year - 1) / yearRange, 10) * yearRange + 1;
        for ( var i = 0; i < yearRange; i++ ) {
          var dt = new Date(startYear + i, 0, 1);
          years[i] = makeDate(dt, format.year, (selected && selected.getFullYear() === dt.getFullYear()));
        }
        return { objects: years, title: [years[0].label, years[yearRange - 1].label].join(' - ') };
      },
      compare: function(date1, date2) {
        return date1.getFullYear() - date2.getFullYear();
      },
      split: 5,
      step: { years: yearRange }
    }
  ];

  this.isDisabled = function(date, mode) {
    var currentMode = this.modes[mode || 0];
    return ((this.minDate && currentMode.compare(date, this.minDate) < 0) || (this.maxDate && currentMode.compare(date, this.maxDate) > 0) || ($scope.dateDisabled && $scope.dateDisabled({date: date, mode: currentMode.name})));
  };
}])

.directive( 'datepicker', ['dateFilter', '$parse', 'datepickerConfig', '$log', '$timeout', function (dateFilter, $parse, datepickerConfig, $log, $timeout) {
  return {
    restrict: 'EA',
    replace: true,
    templateUrl: 'template/datepicker/datepicker.html',
    scope: {
      dateDisabled: '&',
      skipCalendarOnTab: '&'
    },
    require: ['datepicker', '?^ngModel'],
    controller: 'DatepickerController',
    link: function(scope, element, attrs, ctrls) {
      var datepickerCtrl = ctrls[0], ngModel = ctrls[1];

      if (!ngModel) {
        return; // do nothing if no ng-model
      }

      // Configuration parameters
      var mode = 0, selected = new Date(), showWeeks = datepickerConfig.showWeeks;

      if(scope.skipCalendarOnTab() === true){
          element.find('button').prop('tabIndex', '-1');
      }

      if (attrs.showWeeks) {
        scope.$parent.$watch($parse(attrs.showWeeks), function(value) {
          showWeeks = !! value;
          updateShowWeekNumbers();
        });
      } else {
        updateShowWeekNumbers();
      }

      if (attrs.min) {
        scope.$parent.$watch($parse(attrs.min), function(value) {
          if(value){
            datepickerCtrl.minDate =  new Date(value);
            if (!attrs.defaultViewDate) {
            	if (!ngModel.$modelValue)
            	{
            		selected = new Date(value);
            	}
            }
          } else {
            datepickerCtrl.minDate = null;
            if (!attrs.defaultViewDate && !ngModel.$modelValue) {
              selected = null;
            }
          }
          refill(true);
        });
      }
      if (attrs.max) {
        scope.$parent.$watch($parse(attrs.max), function(value) {
          datepickerCtrl.maxDate = value ? new Date(value) : null;
          refill();
        });
      }
      if (attrs.defaultViewDate)
      {
      	scope.$parent.$watch($parse(attrs.defaultViewDate), function (value) {
      		if (value) {
      			datepickerCtrl.defaultViewDate = new Date(value);
      			if (!ngModel.$modelValue) {
					selected = new Date(value);
      			}
      		} else {
      			datepickerCtrl.defaultViewDate = null;
      			if (!ngModel.$modelValue) {
      				selected = null;
      			}
      		}
      		refill(true);
      	});
      }

      function updateShowWeekNumbers() {
        scope.showWeekNumbers = mode === 0 && showWeeks;
      }

      // Split array into smaller arrays
      function split(arr, size) {
        var arrays = [];
        while (arr.length > 0) {
          arrays.push(arr.splice(0, size));
        }
        return arrays;
      }

      function refill( updateSelected ) {
        var date = null, valid = true;

        if ( ngModel.$modelValue ) {
          if ( !angular.isDate( ngModel.$modelValue ) ){
            valid = false;
          } else {
            date = ngModel.$modelValue;
            if ( updateSelected ) {
              selected = date;
            }
          }
        } else {
          date = null; //selected date
          if( !selected && updateSelected ) { //selected is populated by datepicker navigation so don't overwrite
            //selected = datepickerCtrl.minDate || moment().startOf('day').toDate(); //visible date
			selected = moment().startOf('day').toDate();
          }
        }

        ngModel.$setValidity('date', valid);

        var currentMode = datepickerCtrl.modes[mode], data = currentMode.getVisibleDates(selected, date);
        angular.forEach(data.objects, function(obj) {
          obj.disabled = datepickerCtrl.isDisabled(obj.date, mode);
        });

        if(attrs.dateDisabled) {
          ngModel.$setValidity('date-disabled', (!date || !datepickerCtrl.isDisabled(date)));
        }

        scope.rows = split(data.objects, currentMode.split);
        scope.labels = data.labels || [];
        scope.title = data.title;
      }

      function setMode(value) {
        mode = value;
        updateShowWeekNumbers();
        refill();
      }

      ngModel.$render = function() {
        if(ngModel.$viewValue == null){
          selected = null;
        }
        refill( true );
      };

      scope.select = function( date ) {
        if ( mode === 0 ) {
          ngModel.$setViewValue( date );
          refill( true );
        } else {
          selected = date;
          setMode( mode - 1 );
        }
      };
      scope.move = function(direction) {
        var step = datepickerCtrl.modes[mode].step;
        selected = moment(selected)
          .add('months', direction * (step.months || 0))
          .add('year', direction * (step.years || 0))
          .toDate();
        refill();
      };
      scope.toggleMode = function() {
        setMode( (mode + 1) % datepickerCtrl.modes.length );
      };
      scope.getWeekNumber = function(row) {
        return ( mode === 0 && scope.showWeekNumbers && row.length === 7 ) ? getISO8601WeekNumber(row[0].date) : null;
      };

      function getISO8601WeekNumber(date) {
        var checkDate = new Date(date);
        checkDate.setDate(checkDate.getDate() + 4 - (checkDate.getDay() || 7)); // Thursday
        var time = checkDate.getTime();
        checkDate.setMonth(0); // Compare with Jan 1
        checkDate.setDate(1);
        return Math.floor(Math.round((time - checkDate) / 86400000) / 7) + 1;
      }
    }
  };
}])

.constant('datepickerPopupConfig', {
  dateFormat: 'yyyy-MM-dd',
  currentText: 'Today',
  toggleWeeksText: 'Weeks',
  clearText: 'Clear',
  closeText: 'Done',
  closeOnDateSelection: true,
  appendToBody: false,
  displayOnFocus: true,
  skipCalendarOnTab: false
})

.directive('datepickerPopup', ['$compile', '$parse', '$document', '$position', 'dateFilter', 'datepickerPopupConfig', 'datepickerConfig', '$timeout',
function ($compile, $parse, $document, $position, dateFilter, datepickerPopupConfig, datepickerConfig, $timeout) {
  return {
    restrict: 'EA',
    require: 'ngModel',
    //scope: true,
    link:  function(originalScope, element, attrs, ngModel) {
          var options = originalScope.$eval(attrs.datepickerOptions) || {};
          var dateFormat = options.displayFormat ? options.displayFormat.toUpperCase() : datepickerPopupConfig.dateFormat.toUpperCase();
          var editFormat = options.editFormat ? options.editFormat.toUpperCase().split(',') : dateFormat;
          var editFormatLengths = [];

          attrs.$observe('datepickerPopup', function(value) {
            dateFormat = value || datepickerPopupConfig.dateFormat;
            dateFormat = dateFormat.toUpperCase();
            if(!options.editFormat){
              editFormat = dateFormat;
            }
            ngModel.$render();
          });

          if(!editFormat){
            attrs.$observe('editFormat', function(value) {
              editFormat = value || datepickerPopupConfig.dateFormat;
              editFormat = editFormat.toUpperCase().split(',');
              ngModel.$render();
            });
          } else {
            if(angular.isArray(editFormat)) {
              //Trim formats and capture lengths
              angular.forEach(editFormat, function(format,key){
                editFormat[key] = format.trim();
                editFormatLengths.push(editFormat[key].length);
              });
            }
          }

          var closeOnDateSelection = angular.isDefined(attrs.closeOnDateSelection) ? originalScope.$eval(attrs.closeOnDateSelection) : datepickerPopupConfig.closeOnDateSelection;
          var appendToBody = angular.isDefined(attrs.datepickerAppendToBody) ? originalScope.$eval(attrs.datepickerAppendToBody) : datepickerPopupConfig.appendToBody;
          var displayOnFocus = angular.isDefined(attrs.displayOnFocus) ? originalScope.$eval(attrs.displayOnFocus) : datepickerPopupConfig.displayOnFocus;
          var skipCalendarOnTab = angular.isDefined(attrs.skipCalendarOnTab) ? originalScope.$eval(attrs.skipCalendarOnTab) : datepickerPopupConfig.skipCalendarOnTab;

          // create a child scope for the datepicker directive so we are not polluting original scope
          var scope = originalScope.$new();

          originalScope.$on('$destroy', function() {
            scope.$destroy();
          });

          attrs.$observe('currentText', function(text) {
            scope.currentText = angular.isDefined(text) ? text : datepickerPopupConfig.currentText;
          });
          attrs.$observe('toggleWeeksText', function(text) {
            scope.toggleWeeksText = angular.isDefined(text) ? text : datepickerPopupConfig.toggleWeeksText;
          });
          attrs.$observe('clearText', function(text) {
            scope.clearText = angular.isDefined(text) ? text : datepickerPopupConfig.clearText;
          });
          attrs.$observe('closeText', function(text) {
            scope.closeText = angular.isDefined(text) ? text : datepickerPopupConfig.closeText;
          });

          var minDateMoment, maxDateMoment, defaultViewDateMoment;
          if (attrs.defaultViewDate) {
          	defaultViewDateMoment = scope.$parent.$eval(attrs.defaultViewDate);
          	scope.$parent.$watch($parse(attrs.defaultViewDate), function (value) {
          		defaultViewDateMoment = value ? moment(value).startOf('day') : null;
          		formatter(ngModel.$modelValue);//validate date
          	});
          }		  
          if (attrs.min) {
            minDateMoment = scope.$parent.$eval(attrs.min);
            scope.$parent.$watch($parse(attrs.min), function(value) {
              minDateMoment = value ? moment(value).startOf('day') : null;
              formatter(ngModel.$modelValue);//validate date
            });
          }
          if (attrs.max) {
            maxDateMoment = scope.$parent.$eval(attrs.max);
            scope.$parent.$watch($parse(attrs.max), function(value) {
              maxDateMoment = value ? moment(value).startOf('day') : null;
              formatter(ngModel.$modelValue);//validate date
            });
          }

          var getIsOpen, setIsOpen;
          if ( attrs.isOpen ) {
            getIsOpen = $parse(attrs.isOpen);
            setIsOpen = getIsOpen.assign;

            originalScope.$watch(getIsOpen, function updateOpen(value) {
              scope.isOpen = !! value;
            });
          }
          scope.isOpen = getIsOpen ? getIsOpen(originalScope) : false; // Initial state

          function setOpen( value ) {
            if (setIsOpen) {
              setIsOpen(originalScope, !!value);
            } else {
              scope.isOpen = !!value;
            }
          }

          var onDocumentClick = function(event) {
            if (scope.isOpen && event.target !== element[0]) {
              scope.$apply(function() {
                setOpen(false);
              });
            }
          };

          var hasFocus;
          var onElementFocusFormatter = function() {
            hasFocus = true;
            scope.$apply(function() {
              ngModel.$render();
            });
          };

          var onElementBlurFormatter = function(e){
            hasFocus = false;
            scope.$apply(function() {
              ngModel.$render();
            });
          };

          var renderBase = ngModel.$render;
          ngModel.$render = function(){
            renderBase();
            if(ngModel.$modelValue && angular.isDate(ngModel.$modelValue)){
              if(hasFocus){
                if(angular.isArray(editFormat)) {
                  var format = editFormat[0];
                  element.val(moment(ngModel.$modelValue).format(format));
                }
              } else {
                element.val( moment(ngModel.$modelValue).format(dateFormat) );
              }
            } else {
              element.val( ngModel.$viewValue );
            }
          };

          /** Set up a watch so we can convert the initial model value into a date, if necessary **/
          var initialParseDeReg = scope.$watch(function() {
              return ngModel.$modelValue;
            },
            function(newValue){
              if(newValue && !angular.isDate(newValue)){
                var mom = moment(newValue);
                if(mom.isValid()){
                  ngModel.$setViewValue(mom.toDate());
                  ngModel.$render();
                }
                initialParseDeReg();//remove watch after initial value examined
              }
          });

          var formatter = function(modelValue){
              if( angular.isDate(modelValue) ){
                  var mom = moment(modelValue);

                  if( mom && mom.isValid() ){
                    var isValid = true;
                    if(minDateMoment && moment(modelValue).isBefore(minDateMoment, 'day')){
                      isValid = false;
                      ngModel.$setValidity('date', true);
                      ngModel.$setValidity('mindate', false);
                    }

                    if(maxDateMoment && moment(modelValue).isAfter(maxDateMoment, 'day')){
                      isValid = false;
                      ngModel.$setValidity('date', true);
                      ngModel.$setValidity('maxdate', false);
                    }

                    if(isValid){
                      ngModel.$setValidity('date', true);
                      ngModel.$setValidity('mindate', true);
                      ngModel.$setValidity('maxdate', true);
                    }

                    scope.date = ngModel.$modelValue;//update scope to update the datepicker control. This is done in the formatter since it is triggered when ng-model is updated.
                    return mom.startOf('day').format(dateFormat);

                  } else {
                    ngModel.$setValidity('date', false);
                    ngModel.$setValidity('mindate', true);
                    ngModel.$setValidity('maxdate', true);
                    scope.date = undefined;
                    return undefined;
                  }
              } else if (modelValue) {
                  ngModel.$setValidity('date', false);
                  ngModel.$setValidity('mindate', true);
                  ngModel.$setValidity('maxdate', true);
                  scope.date = undefined;
                  return undefined;
              } else {
                  ngModel.$setValidity('date', true);
                  ngModel.$setValidity('mindate', true);
                  ngModel.$setValidity('maxdate', true);
                  if (ngModel.$viewValue != undefined) {
                  	var parseResult = parseDate(ngModel.$viewValue);
                  }
                  scope.date = undefined;
              	  return undefined;
              }
          };

          ngModel.$formatters.push(formatter);





          function parseDate(viewValue) {
              if ( !viewValue ) {

                  ngModel.$setValidity('date', true);
                  ngModel.$setValidity('mindate', true);
                  ngModel.$setValidity('maxdate', true);
                  scope.date = undefined;
                  return undefined;

              } else if ( angular.isDate(viewValue) ) {
                  if( minDateMoment && moment(viewValue).isBefore(minDateMoment, 'day')){
                      ngModel.$setValidity('date', true);
                      ngModel.$setValidity('mindate', false);
                      return viewValue;
                  }

                  if( maxDateMoment && moment(viewValue).isAfter(maxDateMoment, 'day')){
                      ngModel.$setValidity('date', true);
                      ngModel.$setValidity('maxdate', false);
                      return viewValue;
                  }

                  ngModel.$setValidity('date', true);
                  ngModel.$setValidity('mindate', true);
                  ngModel.$setValidity('maxdate', true);
                  return viewValue;

              } else if ( angular.isString(viewValue) ) {
                  var mom;
                  var ixMatchingFormat = editFormatLengths.indexOf(viewValue.length);
                  var hasMatchingFormat = ixMatchingFormat > -1;
                  if( hasMatchingFormat ){//Don't attempt to parse dates in a partial state because some will return as valid
                      mom = moment(viewValue, editFormat[ixMatchingFormat]).startOf('day');
                  }

                  if( mom && mom.isValid() ){
                    var date = mom.toDate(),
                        isValid = true;

                    if( minDateMoment && mom.isBefore(minDateMoment, 'day')){
                        isValid = false;
                        ngModel.$setValidity('date', true);
                        ngModel.$setValidity('mindate', false);
                    }

                    if( maxDateMoment && mom.isAfter(maxDateMoment, 'day')){
                        isValid = false;
                        ngModel.$setValidity('date', true);
                        ngModel.$setValidity('maxdate', false);
                    }

                    if( isValid ){
                        ngModel.$setValidity('date', true);
                        ngModel.$setValidity('mindate', true);
                        ngModel.$setValidity('maxdate', true);
                    }
                    scope.date = date;//update the scope so the calendar gets updated
                    return date;

                  } else {
                    ngModel.$setValidity('date', false);
                    ngModel.$setValidity('mindate', true);
                    ngModel.$setValidity('maxdate', true);
                    scope.date = undefined;
                    return undefined;
                  }
              } else {
                ngModel.$setValidity('date', false);
                ngModel.$setValidity('mindate', true);
                ngModel.$setValidity('maxdate', true);
                scope.date = undefined;
                return undefined;
              }
          }

          ngModel.$parsers.unshift(parseDate);

          // popup element used to display calendar
          var popupEl = angular.element('<div datepicker-popup-wrap><div datepicker></div></div>');
          if( skipCalendarOnTab === true ){
            popupEl.children().first().attr('skip-calendar-on-tab', true);
          }

          popupEl.attr({
            'ng-model': 'date',
            'ng-change': 'dateSelection()'
          });

          var datepickerEl = angular.element(popupEl.children()[0]);
          if (attrs.datepickerOptions) {
            datepickerEl.attr(angular.extend({}, originalScope.$eval(attrs.datepickerOptions)));
          }

          // Inner change
          scope.dateSelection = function() {
            ngModel.$setViewValue(scope.date);
            ngModel.$render();

            if (closeOnDateSelection) {
              setOpen( false );
            }
          };

          function addWatchableAttribute(attribute, scopeProperty, datepickerAttribute) {
            if (attribute) {
              originalScope.$watch($parse(attribute), function(value){
                scope[scopeProperty] = value;
              });
              datepickerEl.attr(datepickerAttribute || scopeProperty, scopeProperty);
            }
          }
          addWatchableAttribute(attrs.min, 'min');
          addWatchableAttribute(attrs.max, 'max');
		  addWatchableAttribute(attrs.defaultViewDate, 'defaultViewDate', 'default-view-date');
          if (attrs.showWeeks) {
            addWatchableAttribute(attrs.showWeeks, 'showWeeks', 'show-weeks');
          } else {
            scope.showWeeks = datepickerConfig.showWeeks;
            datepickerEl.attr('show-weeks', 'showWeeks');
          }
          if (attrs.dateDisabled) {
            datepickerEl.attr('date-disabled', attrs.dateDisabled);
          }

          function updatePosition() {
            scope.position = appendToBody ? $position.offset(element) : $position.position(element);
            scope.position.top = scope.position.top + element.prop('offsetHeight');
          }

          var documentBindingInitialized = false, elementFocusInitialized = false;
          element.bind('focus', onElementFocusFormatter);
          element.bind('blur', onElementBlurFormatter);

          var onElementFocusCalendarOpener;
          if(displayOnFocus){
            onElementFocusCalendarOpener = function(){
              setOpen( !skipCalendarOnTab && displayOnFocus );
            };
          }
          scope.$watch('isOpen', function(value) {
            updatePosition();

            if (value) {
              $document.bind('click', onDocumentClick);
              if(elementFocusInitialized && onElementFocusCalendarOpener) {
                element.unbind('focus', onElementFocusCalendarOpener);
              }
              $timeout(function(){ //focus element in timeout so onElementFocusFormatter will fire
                element[0].focus();
              });
              documentBindingInitialized = true;
            } else {
              if(documentBindingInitialized) {
                $document.unbind('click', onDocumentClick);
              }
              if(onElementFocusCalendarOpener){
                element.bind('focus', onElementFocusCalendarOpener);
                elementFocusInitialized = true;
              }
            }

            if ( setIsOpen ) {
              setIsOpen(originalScope, value);
            }
          });

          var $setModelValue = $parse(attrs.ngModel).assign;

          scope.today = function() {
          	var startOfDay = new Date();
          	startOfDay.setHours(0, 0, 0, 0);
          	$setModelValue(originalScope, startOfDay);
          };
          scope.clear = function() {
			ngModel.$viewValue = null;		  
            $setModelValue(originalScope, null);
          };



          var $popup = $compile(popupEl)(scope);
          if ( appendToBody ) {
            $document.find('body').append($popup);
          } else {
            element.after($popup);
          }
        } // link
  };
}])

.directive('datepickerPopupWrap', function() {
  return {
    restrict:'EA',
    replace: true,
    transclude: true,
    templateUrl: 'template/datepicker/popup.html',
    link:function (scope, element, attrs) {
      element.bind('click', function(event) {
        event.preventDefault();
        event.stopPropagation();
      });
    }
  };
});
