class Menu {
	constructor(game) {
		this.game = game;

		this.scene = $('#menu');

		this.start = $('.start');
		this.setup = $('.setup');
		this.exit = $('.exit');
		this.tutorial = $('.tutorial');

		this._bindEvents();
		this._createWindows();
	}
	_bindEvents() {
		this.start.on('click', () => this.game.navigation.toPlay());
		this.setup.on('click', () => this.game.navigation.toSettings());
		this.exit.on('click', () => this.game.navigation.toMenu());
		this.tutorial.on('click', () => this.showTutorial());
	}
	_createWindows() {
		if(!localStorage.getItem('isShowInfo')) {
			this.game.windowManager.addWindow({
				"label": "INFO",
				"text": `
					To Settings, press S <br>
					Show Tutorial, press T
				`
			}, () => {
				this.showTutorial();
			});
			localStorage.setItem('isShowInfo', 1);
		}
	}
	showTutorial() {
		if(this.game.settings.lang == 'ru') {
			this.game.windowManager.addWindow({
				label: "TUTORIAL I",
				text: "Для прохождения головоломки необходимо пересекать игровые точки линиями, которые вы расставляете нажатиями по экрану, однако запомните, что линии являются бесконечными, но Вы видите только отрезки этих линий!"
			}, () => {
				this.game.windowManager.addWindow({
					label: "TUTORIAL II",
					text: "В игре так же присутствуют различный комбинации объектов. Например есть точки, которые нельзя пересекать и так далее, с этим Вам необходимо разобраться и решать головоломки самим!"
				});
			});
		} else {
			this.game.windowManager.addWindow({
				label: "TUTORIAL I",
				text: "To complete the puzzle, you need to cross the game points with lines that you place with the presses on the screen, but remember that the lines are endless, but you see only the segments of these lines!"
			}, () => {
				this.game.windowManager.addWindow({
					label: "TUTORIAL II",
					text: "In the game there are also different combinations of objects. For example, there are points that can not be crossed, and so on, with this you need to understand and solve the puzzles themselves!"
				});
			});
		}
	}
}

module.exports = Menu;
