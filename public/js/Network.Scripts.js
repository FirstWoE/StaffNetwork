/* All JS/JQuery here is by ash! [they/them]#8282 <33 */

function inspire() {
    $.getJSON('http://cors.xonos.gg/famous-quotes.uk/api.php?id=random&tags=motivation', function(api) {
        const apivar = api[0]
        $('.quote').text('"' + apivar[1] + '"');
        $('.quoteauthor').text('- ' + apivar[2]);
    });
};
inspire();

function cl(m) {
    console.log('[FWE Logs]' + m)
}

function sendTheme(m,p) {
    const ThemeName = m
    var price = p
    url = "/Backend/Purchase"
    const hasBought = 'false'
    var body = {
        themename: m,
        price: p,
    }
    $.ajax({
        type: "POST",
        url: url,
        data: body,
        success: function(xhr) {
            location.reload(true);
        },
        error: function(xhr, status, error){
            var data = xhr.responseText;
            var jsonResponse = JSON.parse(data);
            var finaltext = jsonResponse["error"]
            Toastify({
                text: finaltext,
                duration: 3000
                }).showToast();
        }
      });


};

function sendUpgrade(m,p) {
    const ThemeName = m
    var price = p
    url = "/Backend/UpgradeUser"
    const hasBought = 'false'
    var body = {
        upgradename: m,
        price: p,
    }
    $.ajax({
        type: "POST",
        url: url,
        data: body,
        success: function(xhr) {
            location.reload(true);
        },
        error: function(xhr, status, error){
            var data = xhr.responseText;
            var jsonResponse = JSON.parse(data);
            var finaltext = jsonResponse["error"]
            Toastify({
                text: finaltext,
                duration: 3000
                }).showToast();
        }
      });


};
