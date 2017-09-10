const services = require('../services.json');

var notifications = (game) => {
	if(!window.plugins || !window.plugins.OneSignal) return;

	window.plugins.OneSignal
		.startInit(services.OneSignalId, services.GooglePlayId)
		.sendTag('edition', game.edition)
		.sendTag('version', 'v2.1')
		.endInit();
}

module.exports = notifications;
