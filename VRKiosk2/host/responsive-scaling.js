(function($) {
    var $html       = $('html'),
        $body       = $('body'),
        scaleFactor = 0.1,
        scaleMax = 100,
        scaleMin = 30;

    $(document).ready( function() {
        recalcScale();

        $(window).resize(function() {
            recalcScale();
        })
    });

    function recalcScale() {
        var bodyWidth = $body.width();
        setScale(getScaledFontSize(bodyWidth));
    }

    function setScale(int) {
        return $html.css('font-size', getPercentage(int));
    }

    function getScaledFontSize(bodyWidth) {
        var scaledSize = bodyWidth * scaleFactor;

        if(scaledSize > scaleMax) return scaleMax;
        else if (scaledSize < scaleMin) return scaleMin;
        else return scaledSize;
    }

    function getPercentage(int) {
        return int + '%';
    }
}(jQuery));