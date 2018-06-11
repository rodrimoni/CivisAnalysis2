/**
 * Created by Rodrigo on 26/04/2017.
 */


(function ($, window) {
    $.fn.contextMenu = function (settings) {

        return this.each(function () {

            // Open context menu
            $(this).on("contextmenu", function (e) {
                var show = false;
                if (settings.menuFilter !== undefined)
                    show = (settings.menuFilter).call(this);
                // return native menu if pressing control
                if (e.ctrlKey || show) return;

                //open menu
                var $menu = $(settings.menuSelector)
                    .data("invokedOn", $(e.target))
                    .show()
                    .css({
                        position: "absolute",
                        left: getMenuPosition(e.clientX, 'width', 'scrollLeft', 'left'),
                        top: getMenuPosition(e.clientY, 'height', 'scrollTop', 'top')
                    })
                    .off('click')
                    .on('click', 'a', function (e) {
                        $menu.hide();

                        var $invokedOn = $menu.data("invokedOn");
                        var $selectedMenu = $(e.target);

                        settings.menuSelected.call(this, $invokedOn, $selectedMenu);
                    });

                return false;
            });

            //make sure menu closes on any click
            $('body').on('click drag resize', function () {
                $(settings.menuSelector).hide();
            });

        });

        function getMenuPosition(mouse, direction, scrollDir, offsetDir) {
            var win = $(window)[direction](),
                scroll = $(window)[scrollDir](),
                offset = $('.container').offset()[offsetDir],
                menu = $(settings.menuSelector)[direction](),
                position = mouse + scroll - offset;

            // opening menu would pass the side of the page
            if (mouse + menu > win && menu < mouse)
                position -= menu;

            return position;
        }

    };
})(jQuery, window);

