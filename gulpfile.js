var gulp = require('gulp')
  , concat = require('gulp-concat')
  , uglify = require('gulp-uglify')
  , sourcemaps = require('gulp-sourcemaps')
  , rename = require('gulp-rename')
  , del = require('del')
  , usemin = require('gulp-usemin')
  , ghPages = require('gulp-gh-pages')
  , babel = require('gulp-babel')
  , eslint = require('gulp-eslint')
  , browsersync = require('browser-sync').create()
  , postcss = require('gulp-postcss')
  , cssnano = require('cssnano')
  , browserify = require("browserify")
  , babelify = require("babelify")
  , source = require("vinyl-source-stream")
  , buffer = require("vinyl-buffer")
  , terser = require("gulp-terser")
  , htmlmin = require("gulp-htmlmin")


// WATCH TASKS START
function watchFiles() {
    gulp.watch(["src/**/*.es6.js", "src/**/*.css", "src/**/spider.js", "src/*.html"], {queue: false}, gulp.series(build, browserSyncReload))
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

// WATCH TASKS END

// BUILD TASKS START

function cleanDist() {
    return del(['dist/*']);
}

function copyfiles() {
    return gulp.src('src/client/images/**')
    .pipe(gulp.dest('dist/client/images'));
}

function css() {
    return gulp
        .src('src/client/css/*.css')
        .pipe(postcss([cssnano()]))
        .pipe(gulp.dest('dist/client/css'));
}

function scriptsLint() {
    return gulp
        .src(['src/client/*.es6.js','!node_modules/**'])
        .pipe(eslint())
        .pipe(eslint.format())
        .pipe(eslint.failAfterError())
}

// function babeltask() {
//     return gulp.src('src/client/js/app.es6.js')
//         .pipe(babel({presets: ["@babel/preset-env"]}))
//         .pipe(rename('app.js'))
//         .pipe(gulp.dest('src/client/js'))
// }

// function scripts() {
//     return (
//         gulp
//             .src('src/client/js/app.js')
//             .pipe(sourcemaps.init())
//             .pipe(concat('app.min.js'))
//             .pipe(uglify())
//             .pipe(sourcemaps.write('./'))
//             .pipe(gulp.dest('dist/client/js'))
//     );
// }

// function useminfiles() {
//     return gulp.src('src/index.html')
//         .pipe(usemin({
//             css: [(postcss([cssnano()])), 'concat'],
//             js: [uglify(), 'concat']
//         }))
//         .pipe(gulp.dest('dist'));
// }

	
function javascriptBuild() {
    var b = browserify({
        entries: 'src/client/js/app.es6.js',
        debug: true,
        transform: [babelify.configure({
            presets: ["@babel/preset-env"]
        })]
      });
    
    return b.bundle()
      .pipe(source('bundle.js'))
      .pipe(buffer())
      .pipe(sourcemaps.init({loadMaps: true}))
        .pipe(terser())
      .pipe(sourcemaps.write('./'))
      .pipe(gulp.dest('dist/client/js'))

    // Start by calling browserify with our entry pointing to our main javascript file
    // return (
    //     browserify({
    //         // entries: ['src/client/js/app.es6.js', 'src/client/js/spider.js', 'src/client/js/geojson.min.js'],
    //         entries: ['src/client/js/app.es6.js'],
    //         // Pass babelify as a transform and set its preset to @babel/preset-env
    //         transform: [babelify.configure({ presets: ["@babel/preset-env"] })]
    //     })
    //         // Bundle it all up!
    //         .bundle()
    //         // Source the bundle
    //         .pipe(source("bundle.js"))
    //         .pipe(buffer())
    //         // Then write the resulting files to a folder
    //         // .pipe(terser())
    //         .pipe(gulp.dest('dist/client/js'))
    // );
}

	
function htmlBuild() {
    return gulp
        .src(`src/index.html`)
        .pipe(htmlmin())
        .pipe(gulp.dest('dist'));
}

// BUILD TASKS END

function cleanAppJs() {
    return del(['src/client/js/app.js']);
}

function ghPagesTask() {
    return gulp.src('./dist/**/*')
        .pipe(ghPages())
}

const watch = gulp.parallel(watchFiles, browserSync);
const js = gulp.series(javascriptBuild);
const build = gulp.series(cleanDist, copyfiles, css, js, htmlBuild);
const deploy = gulp.series(build, ghPagesTask);
exports.deploy = deploy;
exports.watch = watch;
exports.build = build;
