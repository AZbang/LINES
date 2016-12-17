var ads = {
	init: function(game) {
		ads.game = game;
		ads.isLoad = false;
		if(!window.Cocoon || game.edition === 'PAID') return;

		ads.interstitial = Cocoon.Ad.AdMob.createInterstitial("ad mob key");

		ads.interstitial.on("load", function() {
			ads.isLoad = true;
		});
	},
	load() {
		if(window.Cocoon && ads.game.edition === 'FREE') {
			ads.interstitial.load();
			ads.isLoad = false;
		}
	},
	show() {
		if(window.Cocoon && ads.game.edition === 'FREE') {
			ads.interstitial.show();
		}
	}
}

module.exports = ads;
