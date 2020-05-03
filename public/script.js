(function() {
    var canvas = document.querySelector("canvas");
    var ctx = canvas.getContext("2d");
    // var signature = document.getElementById("signature");

    var sketch = document.querySelector("canvas");
    var sketchStyle = getComputedStyle(sketch);
    canvas.width = parseInt(sketchStyle.getPropertyValue("width"));
    canvas.height = parseInt(sketchStyle.getPropertyValue("height"));

    var mouse = { x: 0, y: 0 };
    var lastMouse = { x: 0, y: 0 };

    canvas.addEventListener(
        "mousemove",
        function(e) {
            lastMouse.x = mouse.x;
            lastMouse.y = mouse.y;

            mouse.x = e.pageX - this.offsetLeft;
            mouse.y = e.pageY - this.offsetTop;
        },
        false
    );

    canvas.addEventListener(
        "mousedown",
        function() {
            canvas.addEventListener("mousemove", onPaint, false);
        },
        false
    );

    canvas.addEventListener(
        "mouseup",
        function() {
            canvas.removeEventListener("mousemove", onPaint, false);
            var signature = document.getElementById("signature");
            signature.value = canvas.toDataURL();
        },
        false
    );

    var onPaint = function() {
        ctx.beginPath();
        ctx.moveTo(lastMouse.x, lastMouse.y);
        ctx.lineTo(mouse.x, mouse.y);
        ctx.closePath();
        ctx.stroke();
    };
})();
