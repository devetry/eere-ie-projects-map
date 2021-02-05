var gulp = require('gulp')
  , concat = require('gulp-concat')
  , uglify = require('gulp-uglify')
  , sourcemaps = require('gulp-sourcemaps')
  , rename = require('gulp-rename')
  , clean = require('gulp-clean')
  , usemin = require('gulp-usemin')
  , ghPages = require('gulp-gh-pages')
  , babel = require('gulp-babel')
  , eslint = require('gulp-eslint')
  , browsersync = require('browser-sync').create()
  , postcss = require('gulp-postcss')
  , cssnano = require('cssnano')

function watchFiles() {
    gulp.watch(["src/**/*"], {queue: false}, gulp.series(build, browserSyncReload))
}

function browserSync(done) {
    browsersync.init({
        server: {
            baseDir: "./dist/"
        },
        port: 3000
    });
    done();
}

// BrowserSync Reload
function browserSyncReload(done) {
    browsersync.reload();
    done();
}

function babeltask() {
    return gulp.src('src/client/js/app.es6.js')
        .pipe(babel({presets: ["@babel/preset-env"]}))
        .pipe(rename('app.js'))
        // this below should be src...
        .pipe(gulp.dest('src/client/js'))
}

function useminfiles() {
    return gulp.src('src/index.html')
        .pipe(usemin({
            css: [(postcss([cssnano()])), 'concat'],
            js: [uglify(), 'concat']
        }))
        .pipe(gulp.dest('dist'));
}

function copyfiles() {
    return gulp.src('src/client/images/**')
    .pipe(gulp.dest('dist/client/images'));
}

function scriptsLint() {
    return gulp
        .src(['src/client/*.es6.js','!node_modules/**'])
        .pipe(eslint())
        .pipe(eslint.format())
        .pipe(eslint.failAfterError())
}
// scripts lint
// babeltask -- instaead of pu
// scripts

function scripts() {
    return (
        gulp
            .src('src/client/js/app.js')
            .pipe(sourcemaps.init())
            .pipe(concat('app.min.js'))
            .pipe(uglify())
            .pipe(sourcemaps.write('./'))
            .pipe(gulp.dest('dist/client/js'))
            // new src to delete app.js from src folder
            // .pipe(browsersync.stream())
    );
}

function css() {
    return gulp
        .src('src/client/css/*.css')
        .pipe(postcss([cssnano()]))
        .pipe(rename({suffix: '.min.css'}))
        .pipe(gulp.dest('dist/client/css'));
}


function cleanDist() {
    return gulp.src(['dist/*'], {read: false})
        .pipe(clean());
}

function cleanAppJs() {
    return gulp.src('src/client/js/app.js', {read: false})
        .pipe(clean());
}

function ghPagesTask() {
    return gulp.src('./dist/**/*')
        .pipe(ghPages())
}

const watch = gulp.parallel(watchFiles, browserSync);
const js = gulp.series(scriptsLint, babeltask, scripts);
const build = gulp.series(cleanDist, copyfiles, css, js, useminfiles);
const deploy = gulp.series(build, ghPagesTask);
exports.deploy = deploy;
exports.watch = watch;
exports.build = build;
