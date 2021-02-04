var gulp = require('gulp')
  , concat = require('gulp-concat')
  , uglify = require('gulp-uglify')
  , sourcemaps = require('gulp-sourcemaps')
  , rename = require('gulp-rename')
  , clean = require('gulp-clean')
  , usemin = require('gulp-usemin')
  , cssmin = require('gulp-cssmin')
  , ghPages = require('gulp-gh-pages')
  , runSequence = require('run-sequence')
  , babel = require('gulp-babel')
  , eslint = require('gulp-eslint')
  , browsersync = require('browser-sync').create()

function watchFiles() {
    gulp.watch("src/**/*", gulp.series(build, browserSyncReload))
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
            //assetsDir: 'images',
            css: [cssmin(), 'concat'],
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
        .pipe(cssmin())
        .pipe(rename({suffix: '.min.css'}))
        .pipe(gulp.dest('dist/client/css'));
}


function cleanDist() {
    return gulp.src(['dist/*'], {read: false})
        .pipe(clean());
    // return del(["./dist/*"]);
}

function cleanAppJs() {
    return gulp.src('src/client/js/app.js', {read: false})
        .pipe(clean());
}

gulp.task('clean-es5', function () {
    return gulp.src('src/client/js/app.js', {read: false})
        .pipe(clean())
})

gulp.task('gh-pages', function() {
    return gulp.src('./dist/**/*')
        .pipe(ghPages());
});

gulp.task('deploy', function(cb){
    runSequence('build', ['gh-pages'], cb)
});

const watch = gulp.parallel(watchFiles, browserSync);
const js = gulp.series(scriptsLint, babeltask, scripts);
const build = gulp.series(cleanDist, copyfiles, css, js, useminfiles, cleanAppJs);
exports.watch = watch;
exports.build = build;
