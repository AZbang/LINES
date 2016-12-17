class AjaxRequests {
	constructor(game, repository) {
		this.game = game;
		this.repository = repository;

		this.translates = {
			ask: {
				ru: {
					label: 'INFO',
					text: 'Загрузить новые уровни?'
				},
				en: {
					label: 'INFO',
					text: 'Download new levels?'
				}
			},
			noNewLevels: {
				ru: {
					label: 'INFO',
					text: 'Вы прошли все головоломки в игре. Ожидайте новых уровней каждую неделю!'
				},
				en: {
					label: 'INFO',
					text: 'You passed all the puzzles in the game. Expect new levels every week!'
				}
			},
			failLoadNewLevels: {
				ru: {
					label: 'INFO',
					text: 'Отсутствует соединение с сервером.'
				},
				en: {
					label: 'INFO',
					text: 'No connection to the server.'
				}
			},
		}
	}
	requestNewLevels() {
		var url = `${this.repository}/levels${this.game.play.currentLevel+1}.json`;

		this.game.windowManager.addWindow(this.translates.ask[this.game.settings.lang], () => {
			$.getJSON(url)
				.done((data) => {
					this.game.play.levels = this.game.play.levels.concat(data);
					localStorage.setItem('levels', JSON.stringify(this.game.play.levels));
					this.game.play.loadLevel(this.game.play.currentLevel + 1);
				})
				.fail((err) => {
					var config;

					if (err.status === 404) config = this.translates.noNewLevels[this.game.settings.lang];
					else config = this.translates.failLoadNewLevels[this.game.settings.lang];

					this.game.windowManager.addWindow(config, () => {
						setTimeout(() => this.game.navigation.toMenu(), 300);
					});
				});
		});
	}
}

module.exports = AjaxRequests;