const gulp = require('gulp')
const plugins = require('gulp-load-plugins')()
const runSequence = require('run-sequence')
const del = require('del')
const assign = require('lodash/object/assign')
const browserify = require('browserify')
const watchify = require('watchify')
const babelify = require('babelify')
const hbsfy = require('hbsfy')
const source = require('vinyl-source-stream')
const buffer = require('vinyl-buffer')
const mergeStream = require('merge-stream')
const through = require('through2')

const args = process.argv.slice(3)

gulp.task('clean', function (done) {
  del(['build'], done)
})

gulp.task('copy', function () {
  return mergeStream(
    gulp.src('public/imgs/**/*').pipe(gulp.dest('build/public/imgs/')),
    gulp.src('public/avatars/**/*').pipe(gulp.dest('build/public/avatars/')),
    gulp.src('server/*.txt').pipe(gulp.dest('build/server/')),
    gulp.src('public/*.json').pipe(gulp.dest('build/public/'))
  )
})

gulp.task('css', function () {
  return gulp.src('public/scss/*.scss')
    .pipe(plugins.sass.sync().on('error', plugins.sass.logError))
    .pipe(plugins.sourcemaps.init())
    .pipe(plugins.sass({ outputStyle: 'compressed' }))
    .pipe(plugins.sourcemaps.write('./'))
    .pipe(gulp.dest('build/public/css/'))
})

function createBundle (src) {
  if (!src.push) {
    src = [src]
  }

  const customOpts = {
    entries: src,
    debug: true
  }
  const opts = assign({}, watchify.args, customOpts)
  const bundle = watchify(browserify(opts))

  bundle.transform(babelify.configure({
    stage: 1
  }))

  bundle.transform(hbsfy)
  bundle.on('log', plugins.util.log)
  return bundle
}

function bundle (bundle, outputPath) {
  const splitPath = outputPath.split('/')
  const outputFile = splitPath[splitPath.length - 1]
  const outputDir = splitPath.slice(0, -1).join('/')

  return bundle.bundle()
    .on('error', plugins.util.log.bind(plugins.util, 'Browserify Error'))
    .pipe(source(outputFile))
    // optional, remove if you don't need to buffer file contents
    .pipe(buffer())
    // optional, remove if you dont want sourcemaps
    .pipe(plugins.sourcemaps.init({ loadMaps: true })) // loads map from browserify file
    // Add transformation tasks to the pipeline here.
    .pipe(plugins.sourcemaps.write('./')) // writes .map file
    .pipe(gulp.dest('build/public/' + outputDir))
}

const jsBundles = {
  'js/polyfills/promise.js': createBundle('./public/js/polyfills/promise.js'),
  'js/polyfills/url.js': createBundle('./public/js/polyfills/url.js'),
  'js/settings.js': createBundle('./public/js/settings/index.js'),
  'js/main.js': createBundle('./public/js/main/index.js'),
  'js/remote-executor.js': createBundle('./public/js/remote-executor/index.js'),
  'js/idb-test.js': createBundle('./public/js/idb-test/index.js'),
  'sw.js': createBundle(['./public/js/sw/index.js', './public/js/sw/preroll/index.js'])
}

gulp.task('js:browser', function () {
  return mergeStream.apply(null,
    Object.keys(jsBundles).map(function (key) {
      return bundle(jsBundles[key], key)
    })
  )
})

gulp.task('js:server', function () {
  return gulp.src('server/**/*.js')
    .pipe(plugins.sourcemaps.init())
    .pipe(plugins.babel({ stage: 1 }))
    .on('error', plugins.util.log.bind(plugins.util))
    .pipe(plugins.sourcemaps.write('.'))
    .pipe(gulp.dest('build/server'))
})

gulp.task('templates:server', function () {
  return gulp.src('templates/*.hbs')
    .pipe(plugins.handlebars())
    .on('error', plugins.util.log.bind(plugins.util))
    .pipe(through.obj(function (file, enc, callback) {
      // Don't want the whole lib
      file.defineModuleOptions.require = { Handlebars: 'handlebars/runtime' }
      callback(null, file)
    }))
    .pipe(plugins.defineModule('commonjs'))
    .pipe(plugins.rename(function (path) {
      path.extname = '.js'
    }))
    .pipe(gulp.dest('build/server/templates'))
})

gulp.task('watch', function () {
  gulp.watch(['public/scss/**/*.scss'], ['css'])
  gulp.watch(['templates/*.hbs'], ['templates:server'])
  gulp.watch(['server/**/*.js'], ['js:server'])
  gulp.watch(['public/imgs/**/*', 'public/avatars/**/*', 'server/*.txt', 'public/*.json'], ['copy'])

  Object.keys(jsBundles).forEach(function (key) {
    const jsBundle = jsBundles[key]
    jsBundle.on('update', function () {
      return bundle(jsBundle, key)
    })
  })
})

gulp.task('server', function () {
  plugins.developServer.listen({
    path: './index.js',
    cwd: './build/server',
    args: args
  })

  gulp.watch([
    'build/server/**/*.js'
  ], plugins.developServer.restart)
})

gulp.task('serve', function (callback) {
  runSequence('clean', ['css', 'js:browser', 'templates:server', 'js:server', 'copy'], ['server', 'watch'], callback)
})
