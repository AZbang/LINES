var notifications = function(game) {
	if(!window.plugins || !window.plugins.OneSignal) return;

	var notificationOpenedCallback = function(jsonData) {
		console.log('notificationOpenedCallback: ' + JSON.stringify(jsonData));
	};

	window.plugins.OneSignal
		.startInit("OneSignal key", "googlePlay id")
		.handleNotificationOpened(notificationOpenedCallback)
		.endInit();

	window.plugins.OneSignal.sendTag('edition', game.edition);
}

module.exports = notifications;