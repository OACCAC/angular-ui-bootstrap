angular.module('ui.bootstrap.dropdownToggle', ['ui.bootstrap.position'])

    .constant('dropdownConfig', {
      openClass: 'open'
    })

    .service('dropdownService', ['$document', function($document) {
      var openScope = null;

      this.open = function( dropdownScope ) {
        if ( !openScope ) {
          $document.bind('click', closeDropdown);
          $document.bind('keydown', escapeKeyBind);
        }

        if ( openScope && openScope !== dropdownScope ) {
          openScope.isOpen = false;
        }

        openScope = dropdownScope;
      };

      this.close = function( dropdownScope ) {
        if ( openScope === dropdownScope ) {
          openScope = null;
          $document.unbind('click', closeDropdown);
          $document.unbind('keydown', escapeKeyBind);
        }
      };

      var closeDropdown = function( evt ) {
        // This method may still be called during the same mouse event that
        // unbound this event handler. So check openScope before proceeding.
        if (!openScope) { return; }

        var toggleElement = openScope.getToggleElement();
        if ( evt && toggleElement && toggleElement[0].contains(evt.target) ) {
          return;
        }

        openScope.$apply(function() {
          openScope.isOpen = false;
        });
      };

      var escapeKeyBind = function( evt ) {
        if ( evt.which === 27 ) {
          openScope.focusToggleElement();
          closeDropdown();
        }
      };
    }])

    .controller('DropdownController', ['$scope', '$attrs', '$parse', 'dropdownConfig', 'dropdownService', '$animate', function($scope, $attrs, $parse, dropdownConfig, dropdownService, $animate) {
      var self = this,
          scope = $scope.$new(), // create a child scope so we are not polluting original one
          openClass = dropdownConfig.openClass,
          getIsOpen,
          setIsOpen = angular.noop,
          toggleInvoker = $attrs.onToggle ? $parse($attrs.onToggle) : angular.noop;

      this.init = function( element ) {
        self.$element = element;

        if ( $attrs.isOpen ) {
          getIsOpen = $parse($attrs.isOpen);
          setIsOpen = getIsOpen.assign;

          $scope.$watch(getIsOpen, function(value) {
            scope.isOpen = !!value;
          });
        }
      };

      this.toggle = function( open ) {
        return scope.isOpen = arguments.length ? !!open : !scope.isOpen;
      };

      // Allow other directives to watch status
      this.isOpen = function() {
        return scope.isOpen;
      };

      scope.getToggleElement = function() {
        return self.toggleElement;
      };

      scope.focusToggleElement = function() {
        if ( self.toggleElement ) {
          self.toggleElement[0].focus();
        }
      };

      scope.$watch('isOpen', function( isOpen, wasOpen ) {
        $animate[isOpen ? 'addClass' : 'removeClass'](self.$element, openClass);

        if ( isOpen ) {
          scope.focusToggleElement();
          dropdownService.open( scope );
        } else {
          dropdownService.close( scope );
        }

        setIsOpen($scope, isOpen);
        if (angular.isDefined(isOpen) && isOpen !== wasOpen) {
          toggleInvoker($scope, { open: !!isOpen });
        }
      });

      $scope.$on('$locationChangeSuccess', function() {
        scope.isOpen = false;
      });

      $scope.$on('$destroy', function() {
        scope.$destroy();
      });
    }])

    .directive('dropdown', function() {
      return {
        controller: 'DropdownController',
        link: function(scope, element, attrs, dropdownCtrl) {
          dropdownCtrl.init( element );
        }
      };
    })

    .directive('dropdownToggle', ['$animate','$document','$position','$timeout','$window', function($animate,$document,$position,$timeout,$window) {
      return {
        require: '?^dropdown',
        link: function(scope, element, attrs, dropdownCtrl) {
          if ( !dropdownCtrl ) {
            return;
          }

          dropdownCtrl.toggleElement = element;

          var toggleDropdown = function(event) {
            event.preventDefault();

            if ( !element.hasClass('disabled') && !attrs.disabled ) {
              scope.$apply(function() {
                dropdownCtrl.toggle();
              });
            }
          };

          var dropdownMenu = element.parent().find('.dropdown-menu');
          var appendToBody = angular.isDefined(attrs.appendToBody) ? scope.$eval(attrs.appendToBody) : false;
          var closeOnClick = angular.isDefined(attrs.closeOnClick) ? scope.$eval(attrs.closeOnClick) : true;
          if(!closeOnClick){
            dropdownMenu.bind('click', function(event){
              event.stopPropagation();
            });
          }
          function updateDropdownMenuPosition() {
            btnPosition = $position.position(element);
            btnOffset = $position.offset(element);
            var newPosition = {
              top: btnPosition.top + btnOffset.top + btnPosition.height,
              left: btnPosition.left + btnOffset.left
            };
            dropdownMenu.css(newPosition);
          }

          if(appendToBody){
            //Move element to the body
            $animate.move(dropdownMenu, $document.find('body'));
            dropdownMenu.css({position: 'absolute'});
            $timeout(function () {
              updateDropdownMenuPosition();
            }, 0, false);
            $($window).on('resize',updateDropdownMenuPosition);
          }

          element.bind('click', toggleDropdown);

          // WAI-ARIA
          element.attr({ 'aria-haspopup': true, 'aria-expanded': false });
          scope.$watch(dropdownCtrl.isOpen, function( isOpen ) {
            var open = !!isOpen;
            if(open){
              dropdownMenu.addClass('show');
            } else {
              dropdownMenu.removeClass('show');
            }

          });

          scope.$on('$destroy', function() {
            element.unbind('click', toggleDropdown);
          });
        }
      };
    }]);
