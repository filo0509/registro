const loaderContainer = document.querySelector('.loader-container');
window.addEventListener('load', () => {
    setTimeout(() => {
        $("#spinner-container").fadeOut(400, 'swing', function () {
            $(".spinner").remove()
        });
    }, 200)
});