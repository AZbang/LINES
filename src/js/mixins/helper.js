var helper = {
	getHeightTriangle(x, y, x2, y2, x3, y3) {
		//длины сторон треугольника
		var AC = helper.getDistance(x, y, x3, y3);
		var BC = helper.getDistance(x2, y2, x3, y3);
		var AB = helper.getDistance(x, y, x2, y2);

		//полупериметр
		var p = (AC+BC+AB)/2;

		//Формула длины высоты с помощью сторон треугольника
		var h = (2/AB)*Math.sqrt(p*(p-AB)*(p-AC)*(p-BC));

		return h;
	},
	getDistance(x, y, x2, y2) {
		//длины сторон треугольника
		return Math.sqrt(Math.pow(x2-x, 2) + Math.pow(y2-y, 2));
	},
	getlongСoordsLine(x, y, x2, y2, n) {
		var longX = x2 - x;
		var longY = y2 - y;
		
		return {x: x2+longX*n, y: y2+longY*n};
	},
	isContains(rx, ry, rw, rh, x, y) {
		return x >= rx && x <= rx+rw && y >= ry && y <= ry+rh;
	},
	intRandRange(min, max) {
	  	return Math.floor(Math.random() * (max - min + 1)) + min;
	},
	floatRandRange(min, max) {
	  	return +(Math.random() * (max - min) + min).toFixed(1);
	},
	inRangeArray(value, arr) {
		if(value > arr.length-1) return 0;
		else if(value < 0) return arr.length-1;
		else return value;
	}
};

module.exports = helper;