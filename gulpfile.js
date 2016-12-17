'use strict';

const gulp = require('gulp');
const connect = require('gulp-connect');
const uglify = require('gulp-uglify');
const stylus = require('gulp-stylus');
const jade = require('gulp-jade');
const imagemin = require('gulp-imagemin');
const plumber = require('gulp-plumber');
const notify = require('gulp-notify');
const sourcemaps = require('gulp-sourcemaps');
const gulpIf = require('gulp-if');
const zip = require('gulp-zip');
const builder = require('gulp-nw-builder');
const babel = require('gulp-babel');
const browserify = require("gulp-browserify");

var isDev = process.env.DEV !== 'production';
var pathes = {
	root: './dist',
	build: {
		all: './dist/**/*.*',
		img: './dist/assets/img',
		templates: './dist',
		css: './dist',
		js: './dist',
		zip: './zip'
	},
	src: {
		root: './src',
		img: './src/img/**/*.*',
		js: './src/js/app.js',
		templates: './src/templates/index.jade',
		css: './src/styles/index.styl',
	},
	watch: {
		js: './src/js/**/*.*',
		img: './src/img/**/*.*',
		templates: './src/templates/**/*.*',
		css: './src/styles/**/*.*'
	}
};

var errorMessage = () => {
	return plumber({errorHandler: notify.onError((err) => {
		return {
			title: err.name,
			message: err.message
		}
	})})
}

gulp.task('server', () => {
	return connect.server({
		port: 1338,
		livereload: true,
		root: pathes.root
	});
});


gulp.task("js", function(){
	return gulp.src(pathes.src.js)
		.pipe(errorMessage())
		.pipe(browserify({
			debug: isDev
		}))
		.pipe(gulpIf(!isDev, babel({
			presets: ['es2015']
		})))
		.pipe(gulpIf(!isDev, uglify()))
		.pipe(gulp.dest(pathes.build.js))
		.pipe(connect.reload());
});

gulp.task("templates", function(){
	return gulp.src(pathes.src.templates)
		.pipe(errorMessage())
		.pipe(jade())
		.pipe(gulp.dest(pathes.build.templates))
		.pipe(connect.reload());
});

gulp.task("styles", function(){
	return gulp.src(pathes.src.css)
		.pipe(errorMessage())
		.pipe(stylus())
		.pipe(gulp.dest(pathes.build.css))
		.pipe(connect.reload());
});

gulp.task('images', function () {
	return gulp.src(pathes.src.img)
		.pipe(errorMessage())
		.pipe(imagemin())
		.pipe(gulp.dest(pathes.build.img))
		.pipe(connect.reload());
});

gulp.task('watch', function() {
	gulp.watch(pathes.watch.js, ['js']);
	gulp.watch(pathes.watch.images, ['images']);
	gulp.watch(pathes.watch.templates, ['templates']);
	gulp.watch(pathes.watch.css, ['styles']);
});


// Variants build

gulp.task('default', ['templates', 'styles', 'js', 'images', 'server', 'watch']);

gulp.task('zip', function() {
	return gulp.src(pathes.build.all)
		.pipe(zip('lines.zip'))
		.pipe(gulp.dest(pathes.build.zip))
});

gulp.task('nw', function() {
	return gulp.src(pathes.build.all)
		.pipe(builder({
			platforms: ['linux64', 'win64']
		}));
});

//end