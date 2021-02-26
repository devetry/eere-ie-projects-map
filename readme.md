# Indian Energy Projects Map

MapBox.js map and datatable showing Indian Energy project information.

This project uses gulp.js for task automation.

## Requirements

* git - https://git-scm.com/book/en/v2/Getting-Started-Installing-Git
* node - https://nodejs.org/en/download/
* gulp - https://github.com/gulpjs/gulp/blob/master/docs/getting-started.md


## Development

Work in the ```src/``` folder. The ```npx gulp watch``` task monitors changes in the src folder, runs the build task, and serves from the ```dist/``` folder.


## Install

```bash
$ git clone https://github.com/NREL/eere-ie-projects-map.git
$ npm install
```
If you have issues running npm, see https://github.nrel.gov/TADA/nrel-certs.


## Build
To build the distribution, run the build task.

```bash
$ npx gulp build
```
(You can run the ```npx gulp watch``` task to continually build.)

## Deploy
To deploy to http://nrel.github.io/eere-ie-projects-map/ run the deploy task. Using ```npx``` as specified below means you will not have to install gulp globally.

```bash
$ npx gulp deploy
```

This task will run a build step, write the results to a `.publish` folder (which is in the `.gitignore`) and push the contents of the `.publish` folder to the gh-pages branch.

### In the wild
The map lives here: http://energy.gov/indianenergy/tribal-energy-projects-map

### Debugging in production

It appears that `browsersync`, which is used to reload and serve the files for local developement may do some light parsing of html files (ignoring trailing slashes, etc.) that does not happen in production. So, if you're noticing a bug that's appearing in production but you can't seem to reproduce locally with `gulp watch`, try reproducing the production environment by

1. running `gulp build`
2. instead of going to port 3000 to view the map, open `[path]/eere-ie-projects-map/dist/index.html`
3. open the browser console

