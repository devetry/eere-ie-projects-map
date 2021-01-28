var gulp = require('gulp')
  , concat = require('gulp-concat')
  , uglify = require('gulp-uglify')
  , sourcemaps = require('gulp-sourcemaps')
  , rename = require('gulp-rename')
  , clean = require('gulp-clean')
  , usemin = require('gulp-usemin')
  , cssmin = require('gulp-cssmin')
  , livereload = require('gulp-livereload')
  , ghPages = require('gulp-gh-pages')
  , runSequence = require('run-sequence')
  , babel = require('gulp-babel')
  , eslint = require('gulp-eslint')
  , browsersync = require('browser-sync').create()
  , del = require("del");


// Watch Our Files
// gulp.task('watch', function() {
//     livereload.listen(1234);
//     // gulp.watch('src/**/*', gulp.series(['build'])).on('change', livereload.changed)
//     gulp.watch('src/**/*', gulp.series(['build']))
//     gulp.watch('dist/**/*').on('change', livereload.changed)
// });

// function watchFiles() {
//     gulp.watch("src/**/*", css);
//     gulp.watch("src/js/**/*", gulp.series(scriptsLint, scripts));
//     gulp.watch(
//       [
//         "./_includes/**/*",
//         "./_layouts/**/*",
//         "./_pages/**/*",
//         "./_posts/**/*",
//         "./_projects/**/*"
//       ],
//       gulp.series(browserSyncReload)
//     );
//     // gulp.watch("./assets/img/**/*", images);
//   }

function watchFiles() {
    gulp.watch("src/**/*", gulp.series(browserSyncReload))
}

function browserSync(done) {
    browsersync.init({
        server: {
            baseDir: "./src/"
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

  // Clean assets
function clean() {
    return del(["./dist/*"]);
}



// gulp.task('babel', function() {
//     return gulp.src('src/client/js/app.es6.js')
//         .pipe(babel({presets: ['es2015']}))
//         .pipe(rename('app.js'))
//         .pipe(gulp.dest('src/client/js'))
// })

function babel() {
    return gulp.src('src/client/js/app.es6.js')
        .pipe(babel({presets: ['es2015']}))
        .pipe(rename('app.js'))
        .pipe(gulp.dest('src/client/js'))
}

// gulp.task('usemin', function() {
//     return gulp.src('src/index.html')
//         .pipe(usemin({
//             //assetsDir: 'images',
//             css: [cssmin(), 'concat'],
//             js: [uglify(), 'concat']
//         }))
//         .pipe(gulp.dest('dist'));
// });

function usemin() {
    return gulp.src('src/index.html')
        .pipe(usemin({
            //assetsDir: 'images',
            css: [cssmin(), 'concat'],
            js: [uglify(), 'concat']
        }))
        .pipe(gulp.dest('dist'));
}

// copy images to dist/
// gulp.task('copyfiles', function() {
//     return gulp.src('src/client/images/**')
//     .pipe(gulp.dest('dist/client/images'));
// });

function copyfiles() {
    return gulp.src('src/client/images/**')
    .pipe(gulp.dest('dist/client/images'));
}

// gulp.task('lint', function () {
//     return gulp.src(['src/client/*.es6.js','!node_modules/**'])
//         .pipe(eslint())
//         .pipe(eslint.format())
//         .pipe(eslint.failAfterError())
// })

function scriptsLint() {
    return gulp
        .src(['src/client/*.es6.js','!node_modules/**'])
        .pipe(eslint())
        .pipe(eslint.format())
        .pipe(eslint.failAfterError())
}

// Concat & Minify JS
// gulp.task('uglify', function(){
//   return gulp.src('src/client/js/app.js')
//         .pipe(sourcemaps.init())
//         .pipe(concat('app.min.js'))
//         //.pipe(rename('app.min.js'))
//         .pipe(uglify())
//         //.pipe(uglify( {compress: {drop_debugger:false} }))
//         .pipe(sourcemaps.write('./'))
//         .pipe(gulp.dest('dist/client/js'))
// })

function scripts() {
    return (
        gulp
            .src('src/client/js/app.js')
            .pipe(sourcemaps.init())
            .pipe(concat('app.min.js'))
            .pipe(uglify())
            .pipe(sourcemaps.write('./'))
            .pipe(gulp.dest('dist/client/js'))
            .pipe(browsersync.stream())
    );
}


// gulp.task('cssmin', function () {
//     return gulp.src('src/client/css/*.css')
//         .pipe(cssmin())
//         .pipe(rename({suffix: '.min.css'}))
//         .pipe(gulp.dest('dist/client/css'));
// });

function css() {
    return gulp
        .src('src/client/css/*.css')
        .pipe(cssmin())
        .pipe(rename({suffix: '.min.css'}))
        .pipe(gulp.dest('dist/client/css'));
}


// remove anything in dist
// gulp.task('clean', function() {
//     return gulp.src(['dist/*'], {read: false})
//         .pipe(clean());
// });

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

// gulp.task('build', gulp.series('clean', 'copyfiles', 'lint','babel', 'usemin' /*, 'clean-es5'*/));
const watch = gulp.parallel(watchFiles, browserSync);
const js = gulp.series(scriptsLint, scripts);
const build = gulp.series(clean, copyfiles, css, js, babel, usemin);
exports.watch = watch;
exports.build = build;
