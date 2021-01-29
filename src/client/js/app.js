'use strict';

(function () {
    'use strict';

    var config = {
        googlekey: '1PeYaVWqSWABu6kWKI3VF48_iL-YLAyFJIo9j8Hnx73Y',
        url: 'https://docs.google.com/spreadsheet/pub',
        qstring: '?hl=en_US&hl=en_US&output=html&key=',
        uiFilters: { 'State': [], 'Technology': [], 'Category': [] },
        mapCenter: [-95.84, 37.81 ],
        mapZoom: 3,
        mapboxToken: 'pk.eyJ1IjoibnJlbCIsImEiOiJNOTcxYUhZIn0.Jc7TB_G2VQYs9e0S2laKcw',
        // tileLayer: 'mapbox.streets',
        tileLayer: 'mapbox://styles/energy/ckhc7eaqv0mjm19p3yr4jtlcw',
        mapContainer: 'map',
        datatableContainer: 'datatable',
        dataHeaders: ['Project', 'Tribe', 'State', 'Year', 'Assistance Type', 'Category', 'Technology']
    };

    var map = void 0,
        datatable = void 0,
        data = void 0,
        markerclusters = void 0;

    window.onload = function () {
        init(config);
    };

    function init(cfg) {
        Tabletop.init({
            key: cfg.url + cfg.qstring + cfg.googlekey,
            callback: render,
            simpleSheet: true
        });
    }

    function render(googledata /*, tabletop */) {
        data = googledata; // make the data global

        linkTitle(data); // mashup the project name and hyperlink
        buildUI(data);
        renderMap(config);
        getFilterValues(config);
        renderMapMarkers(data);
        countMarkersFromState('Alaska');
        renderDataTable(data);
    }

    function buildHtmlTemplates(src, uiobj) {
        var tmplSrc = $('script').filter('[data-template="' + src + '"]').html();

        var template = Handlebars.compile(tmplSrc);

        return template(uiobj);
    }

    /**
     *
     * buildUI - build the inputs/selects/checkboxes used to control the map and table
     * @param  {array} data rows from the datasource
     *
     */
    function buildUI(dataarray) {
        var $ui = $('#ui-controls');
        var uiObj = {};

        // todo: refactor - this is not efficient... relooping thru data
        Object.keys(config.uiFilters).forEach(function (title) {

            uiObj[title] = dataarray.map(function (result) {
                return result[title];
            }).sort().filter(function (a, b, c) {
                return c.indexOf(a) === b;
            }); // grab unique items
        });

        $ui.find('[data-target]').each(function (idx, el) {
            var target = $(el).data().target;

            $(el).append(buildHtmlTemplates(target, uiObj));
        });

        // event handler for inputs
        $ui.on('change', 'input, select', function () {
            clearMarkers(markerclusters);
            getFilterValues(config);
            renderMapMarkers(data);
            zoomMapBounds(markerclusters, config);
            filterDataTable();
        });
    }

    /**
     * Wrap the project name in a hyperlink
     *
     * @param  {array} data - rows from datasource
     *
     */
    function linkTitle(dataarray) {

        dataarray.forEach(function (row) {
            row.Project = '<a target="_blank" href="' + row.Link + '">' + row.Project + '</a>';
        });
    }

    /**
     * todo: if one of our headers isn't in the data, prune it so DT doesn't throw an error
     * [renderDataTable description]
     * @param  {[type]} data [description]
     */
    function renderDataTable(dataarray) {

        // set up columns properly
        var columns = config.dataHeaders.map(function (header) {
            return {
                title: header,
                data: header
            };
        });

        // swap footer UI element placement
        var dom = '<"row"<"col-sm-6"l><"col-sm-6"f>>' + '<"row"<"col-sm-12"tr>>' + '<"row"<"col-sm-5"p><"col-sm-7"i>>';

        // init the datatable
        datatable = $('#' + config.datatableContainer).DataTable({
            data: dataarray,
            columns: columns,
            dom: dom,
            language: { search: 'Search table:' }
        });
    }

    /**
     *
     * renderMap - set the zoom, coords, tiles, and create a mapbox map
     * @return {[type]} [description]
     *
     */
    // function renderMap(cfg) {
    //     L.mapbox.accessToken = cfg.mapboxToken;        
    //     map = L.mapbox.map(cfg.mapContainer).setView(cfg.mapCenter, cfg.mapZoom).addLayer(L.mapbox.styleLayer(cfg.tileLayer));
    //     // map = L.mapbox.map(cfg.mapContainer).setView(cfg.mapCenter, cfg.mapZoom).addLayer(L.mapbox.tileLayer(cfg.tileLayer));
    // }
    function renderMap(cfg) {

        mapboxgl.accessToken = 'pk.eyJ1IjoibnJlbC1jb21hcHMiLCJhIjoiY2pveGNkcmFrMjdjeDNwcGR4cTF3c3ZhZiJ9.zrGPMAY7OCtiwuSXTWv0fQ';
        map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/streets-v11',
        center: cfg.mapCenter,
        zoom: cfg.mapZoom
        })
        
    }
    /**
     *
     * getFilterValues - check the state of our UI elements
     *
     */
    function getFilterValues(cfg) {

        Object.keys(cfg.uiFilters).forEach(function (filter) {

            var $el = $('#ui-controls [data-target="' + filter + '"] :checked');

            cfg.uiFilters[filter].length = 0; // clear out existing array

            $el.each(function (idx, el) {
                if (el.value.length) {
                    cfg.uiFilters[filter].push(el.value);
                }
            });
        });
    }

    /**
     *
     * renderMapMarkers -
     * @param  {array} data -
     *
     */
    function renderMapMarkers(dataarray) {
        var geojsondata = GeoJSON.parse(dataarray, { Point: ['Latitude', 'Longitude'] }); //todo: abstract out lat/lon field
        map.on('load', function() {
            map.addSource('locations', {
                type: 'geojson',
                data: geojsondata,
                cluster: true,
                clusterMaxZoom: 14,
                clusterRadius: 50
            })
    
            map.addLayer({
                id: 'clusters',
                type: 'circle',
                source: 'locations',
                filter: ['has', 'point_count'],
                paint: {
                    // Use step expressions (https://docs.mapbox.com/mapbox-gl-js/style-spec/#expressions-step)
                    // with three steps to implement three types of circles:
                    //   * Blue, 20px circles when point count is less than 100
                    //   * Yellow, 30px circles when point count is between 100 and 750
                    //   * Pink, 40px circles when point count is greater than or equal to 750
                    'circle-color': [
                    'step',
                    ['get', 'point_count'],
                    '#51bbd6',
                    100,
                    '#f1f075',
                    750,
                    '#f28cb1'
                    ],
                    'circle-radius': [
                    'step',
                    ['get', 'point_count'],
                    20,
                    100,
                    30,
                    750,
                    40
                    ]
                    }
            })
        })
        
        // /**
        //  * Custom function for creating icons.
        //  * Allows us to override cluster size breakpoints when we init MarkerCluster.
        //  */
        // function iconCreateFunction(cluster) {
        //     var childCount = cluster.getChildCount();

        //     var c = ' marker-cluster-';
        //     if (childCount < 10) {
        //         c += 'small';
        //     } else if (childCount < 50) {
        //         c += 'medium';
        //     } else {
        //         c += 'large';
        //     }

        //     return new L.DivIcon({
        //         html: '<div><span>' + childCount + '</span></div>',
        //         className: 'marker-cluster' + c,
        //         iconSize: new L.Point(40, 40)
        //     });
        // }

        // markerclusters = new L.MarkerClusterGroup({
        //     spiderfyOnMaxZoom: true,
        //     singleMarkerMode: true,
        //     disableClusteringAtZoom: 20 // so we can see markers with identical lat/lon
        //     , iconCreateFunction: iconCreateFunction
        // });

        // // manually fire spiderfy
        // // markerclusters.on( 'clusterclick', function (e) { e.layer.spiderfy() })

        // var geojsondata = GeoJSON.parse(dataarray, { Point: ['Latitude', 'Longitude'] }); //todo: abstract out lat/lon field

        // var featureLayer = L.mapbox.featureLayer().setGeoJSON(geojsondata);

        // // filter data
        // featureLayer.setFilter(function (feature) {
        //     return filterData(feature, config.uiFilters);
        // });

        // // add markers and popup content to markercluster group
        // featureLayer.eachLayer(function (marker) {

        //     var content = '<h3>' + marker.feature.properties.Tribe + '</h3>';

        //     content += '<h4>' + marker.feature.properties.Project + '</h4>';

        //     marker.bindPopup(content);

        //     marker.setIcon(L.mapbox.marker.icon({}));

        //     markerclusters.addLayer(marker);
        // });

        // // add markers to map
        // map.addLayer(markerclusters);
    }

    function countMarkersFromState(state) {
        var arr = [];

        map.eachLayer(function (layer) {
            if (layer === markerclusters) {
                layer.eachLayer(function (marker) {
                    if (marker.feature.properties.State === state) {
                        arr.push(marker);
                    }
                });
            }
        });
        $('#count-alaska').text(arr.length);
        //console.log('found '+ arr.length + ' markers from ' + state)
    }

    /**
     * Zoom the map to show all markers if there are any.
     */
    function zoomMapBounds(markerLayer, cfg) {

        if (markerLayer.getLayers().length) {
            map.fitBounds(markerLayer.getBounds());
        } else {
            map.setView(cfg.mapCenter, cfg.mapZoom);
            alert('No projects fit the criteria.');
        }
    }

    /**
     * clearMarkers - remove the marker layer from the map
     * @param  {object} markerLayer
     */
    function clearMarkers(markerLayer) {
        if (markerLayer !== undefined) {
            map.removeLayer(markerLayer);
        } else {
            console.log('Marker layer was undefined. Nothing to remove.');
        }
    }

    /**
     * filterData - find a value within an object's keys
     * @param  {object} feature
     * @param  {object} filters
     * @return {boolean} true if the feature matches
     */
    function filterData(feature, filters) {

        var bln = true;

        Object.keys(filters).forEach(function (filter) {
            var props = void 0;

            if (feature.properties[filter]) {
                props = feature.properties[filter].split(','); // convert comma separated string to array

                bln = bln && matches(props, filters[filter]);
            }
        });

        return bln;
    }

    /**
     * matches - check if any of the criteria match our properties
     *
     * @param  {array} needles list of properties of an object
     * @param  {array} haystack array containing a list of criteria we're looking for
     *
     * @return {boolean} true if any of needles are in haystack
     */
    function matches(needles, haystack) {
        console.log('bey')
        var ismatch = void 0;

        ismatch = haystack.length ? haystack.some(function (option) {
            return needles.indexOf(option) >= 0;
        }) : true;
        // if ( haystack.length ) {
        //   ismatch   = haystack.some( option => needles.indexOf( option ) >= 0 )
        // }

        return ismatch;
    }

    /**
     * escapeRegExp - make a string safe for use as a regular expression
     * @param  {string} str input string
     * @return {string}    string with special regex characters escaped
     */
    function escapeRegExp(str) {
        return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
    }

    /**
     * filterDataTable - use datatables search/filter function to filter the table
     * @param  {[type]} terms [description]
     *
     */
    function filterDataTable() {

        Object.keys(config.uiFilters).forEach(function (filter) {

            var idx = config.dataHeaders.indexOf(filter);

            // build out regex terms that match the word/phrase exactly
            // eg don't let "other" match "geothermal"
            // and escape out control characters
            var terms = config.uiFilters[filter].map(function (val) {
                val = escapeRegExp(val);
                return '^' + val + '$';
            });

            // convert array to pipe-separated string for regex search
            var regexterms = terms.join('|');

            datatable.column(idx).search(regexterms, true, false);
        });

        datatable.draw();
    }

    /**
     * 	Event handler for Alaska UI button
     */
    $('.map-navigation').on('click', 'a', function (e) {
        e.preventDefault();

        var pos = $(e.delegateTarget).children().data('position');
        console.log('pos',pos)
        if (pos) {
            var loc = pos.split(',').reverse();

            map.easeTo({
                center: loc,
                zoom: 3
            });
        }
    });
})();