
var gulp = require("gulp"),
  sourcemaps = require("gulp-sourcemaps"),
  del = require("del"),
  ghPages = require("gulp-gh-pages"),
  eslint = require("gulp-eslint"),
  browsersync = require("browser-sync").create(),
  postcss = require("gulp-postcss"),
  cssnano = require("cssnano"),
  browserify = require("browserify"),
  babelify = require("babelify"),
  source = require("vinyl-source-stream"),
  buffer = require("vinyl-buffer"),
  terser = require("gulp-terser"),
  htmlmin = require("gulp-htmlmin");

// WATCH TASKS START
function watchFiles() {
  gulp.watch(
    ["src/**/*.es6.js", "src/**/*.css", "src/*.html"],
    { queue: false },
    gulp.series(build, browserSyncReload)
  );
}

function browserSync(done) {
  browsersync.init({
    server: {
      baseDir: "./dist/",
    },
    port: 3000,
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
  return del(["dist/*"]);
}

function copyfiles() {
  return gulp.src("src/client/images/**").pipe(gulp.dest("dist/client/images"));
}

function css() {
  return gulp
    .src("src/client/css/*.css")
    .pipe(postcss([cssnano()]))
    .pipe(gulp.dest("dist/client/css"));
}

function scriptsLint() {
  return gulp
    .src(["src/client/*.es6.js", "!node_modules/**"])
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());
}

function javascriptBuild() {
  var b = browserify({
    entries: "src/client/js/app.es6.js",
    transform: [
      babelify.configure({
        presets: [
          [
            "@babel/preset-env",
            {
              targets: {
                ie: "11",
              },
              useBuiltIns: 'usage',
              corejs: '3.9.1'
            },
          ],
        ],
      }),
    ],
  });

  return b
    .bundle()
    .pipe(source("bundle.js"))
    .pipe(buffer())
    .pipe(sourcemaps.init({ loadMaps: true }))
    .pipe(terser())
    .pipe(sourcemaps.write("./"))
    .pipe(gulp.dest("dist/client/js"));
}

function htmlBuild() {
  return gulp.src(`src/index.html`).pipe(htmlmin()).pipe(gulp.dest("dist"));
}

// BUILD TASKS END

function ghPagesTask() {
  return gulp.src("./dist/**/*").pipe(ghPages());
}

const watch = gulp.parallel(watchFiles, browserSync);
const js = gulp.series(scriptsLint, javascriptBuild);
const build = gulp.series(cleanDist, copyfiles, css, js, htmlBuild);
const deploy = gulp.series(build, ghPagesTask);
exports.deploy = deploy;
exports.watch = watch;
exports.build = build;
