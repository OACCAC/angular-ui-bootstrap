/*
 * dropdownToggle - Provides dropdown menu functionality in place of bootstrap js
 * @restrict class or attribute
 * @example:
   <li class="dropdown">
     <a class="dropdown-toggle">My Dropdown Menu</a>
     <ul class="dropdown-menu">
       <li ng-repeat="choice in dropChoices">
         <a ng-href="{{choice.href}}">{{choice.text}}</a>
       </li>
     </ul>
   </li>
 */

angular.module('ui.bootstrap.dropdownToggle', []).directive('dropdownToggle', ['$document', '$location', '$position','$animate','$timeout', function ($document, $location, $position, $animate,$timeout) {
  var openElement = null,
    closeMenu   = angular.noop;
  return {
    restrict: 'CA',
    link: function(scope, element, attrs) {
      var dropdownMenu = element.parent().find('.dropdown-menu');

      var ddPosition = $position.position(dropdownMenu);
      ddPosition.cssPosition = dropdownMenu.prop('position');

      var appendToBody = angular.isDefined(attrs.appendToBody) ? scope.$eval(attrs.appendToBody) : false;
      var closeOnClick = angular.isDefined(attrs.closeOnClick) ? scope.$eval(attrs.closeOnClick) : true;

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
        updateDropdownMenuPosition();
      }

      scope.$watch('$location.path', function() { closeMenu(); });

      if(closeOnClick){
        element.parent().bind('click', function() { closeMenu(); });
      }

      element.bind('click', function (event) {

        var elementWasOpen = (element === openElement);

        if(closeOnClick){//Accomodates clickable items in the menu without closing it
          event.preventDefault();
          event.stopPropagation();
        }

        if (!!openElement) {
          closeMenu();
        }

        if (!elementWasOpen && !element.hasClass('disabled') && !element.prop('disabled')) {

          if(appendToBody){
            updateDropdownMenuPosition();
            dropdownMenu.addClass('show');
          }


          element.parent().addClass('open');
          openElement = element;
          closeMenu = function (event) {

            if (event) {
              if(!closeOnClick && (event.target == element[0] || angular.element(dropdownMenu).find(event.target).length)){
                return; //Do not close the menu if the click originated inside the menu and closeOnClick is false.
              }

              event.preventDefault();
              event.stopPropagation();
            }

            if(appendToBody){
              //Hide the dropdown menu with the show class
              dropdownMenu.removeClass('show');
            }

            $document.unbind('click', closeMenu);
            element.parent().removeClass('open');
            closeMenu = angular.noop;
            openElement = null;
          };
          $document.bind('click', closeMenu);
        }
      });
    }
  };
}]);
