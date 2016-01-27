 window.onload = function() { init() }

    var map
      , datatable
      , data
      , markerclusters
      , config = {
            googlekey : '1PeYaVWqSWABu6kWKI3VF48_iL-YLAyFJIo9j8Hnx73Y'
          , url : 'https://docs.google.com/spreadsheet/pub'
          , qstring: '?hl=en_US&hl=en_US&output=html&key='
          , uiFilters : { 'State': [], 'Technology': [], 'Category': [] }
          , mapCenter: [ 39.81,-99.84 ]
          , mapZoom: 4
          , mapboxToken: 'pk.eyJ1IjoibnJlbCIsImEiOiJNOTcxYUhZIn0.Jc7TB_G2VQYs9e0S2laKcw'
          , tileLayer: 'mapbox.streets'
          , mapContainer: 'map'
          , datatableContainer: 'datatable'
          , dataHeaders: ['Project', 'Tribe', 'State', 'Year','Assistance Type', 'Category', 'Technology']
    }

    function init() {
        Tabletop.init({
            key: config.url + config.qstring + config.googlekey
          , callback: render
          , simpleSheet: true
        })
    }


    function render(googledata, tabletop) {
        data = googledata // make the data global

        linkTitle( data ) // mashup the project name and hyperlink

        buildUI( data )

        renderMap( data )

        getFilterValues()

        renderMapMarkers( data )

        renderDataTable( data )
    }


    function buildHtmlTemplates( src, data ) {
        var tmplSrc = $('script').filter( '[data-template="' + src + '"]' ).html()

        var template = Handlebars.compile( tmplSrc )

        return  template(  data  )
    }


    function buildUI( data ) {
        var $ui = $('#ui-controls')
        var uiObj = {}

        // todo: refactor - this is not efficient... relooping thru data
        Object.keys(config.uiFilters).forEach( function( title ){

            uiObj[ title ] = data
                .map( function( result ){
                    return result[title]
                })
                .sort()
                .filter( function( a, b, c ){ // grab unique items
                    return c.indexOf(a) === b;
                })
        })

        $ui.find('[data-target]').each( function(idx, el){
            var target = $(this).data().target

            $(this).append( buildHtmlTemplates( target, uiObj ) )
        })
    }

    /**
     * Wrap the project name in a hyperlink
     *
     * @param  {array} rows from datasource
     *
     */
    function linkTitle( data ) {

        data.forEach( function( row ){

            row['Project'] = '<a target="_blank" href="'+ row['Link'] +'">'+ row['Project'] +'</a>'

        })
    }


    function renderDataTable( data ) {

        // set up columns properly
        var aoColumns = config.dataHeaders.map( function(header){
              return {
                  'sTitle': header
                , 'mDataProp': header
              }
        })

        // swap footer UI element placement
        var dom = '<"row"<"col-sm-6"l><"col-sm-6"f>>' +
                  '<"row"<"col-sm-12"tr>>' +
                  '<"row"<"col-sm-5"p><"col-sm-7"i>>'

        // init the datatable
        datatable = $( '#' + config.datatableContainer ).DataTable({
            'aaData': data
          , 'aoColumns': aoColumns
          , 'dom': dom
          , 'oLanguage': { 'sSearch': 'Search table:' }
        })

    }


    function renderMap() {
        L.mapbox.accessToken = config.mapboxToken;

        map = L.mapbox.map( config.mapContainer )
            .setView( config.mapCenter, config.mapZoom)
            .addLayer( L.mapbox.tileLayer( config.tileLayer ) )
    }


    function getFilterValues() {

        Object.keys( config.uiFilters ).forEach( function ( filter ){

            var $el = $('#ui-controls [data-target="' + filter + '"] :checked')

            config.uiFilters[filter].length = 0 // clear out existing array

            $el.each( function(el){
                if ( this.value.length ) {
                    config.uiFilters[filter].push( this.value )
                }
            })

        })

    }


    function renderMapMarkers( data ) {
        var numMarkers = 0 // a counter to know if our layer is empty

        markerclusters = new L.MarkerClusterGroup(
            {
                spiderfyOnMaxZoom: true
              , singleMarkerMode:  true
              , disableClusteringAtZoom: 20 // so we can see markers with identical lat/lon
            }
        )

        // manually fire spiderfy
        // markerclusters.on( 'clusterclick', function (e) {
        //     e.layer.spiderfy()
        // })

        var geojsondata = GeoJSON.parse( data, { Point: ['Latitude','Longitude']} ) //todo: abstract out lat/lon field

        var featureLayer = L.mapbox.featureLayer().setGeoJSON( geojsondata )

        // filter data
        featureLayer.setFilter( function( feature ){
            return filterData( feature, config.uiFilters )
        })


        // add markers and popup content to marchercluster group
        featureLayer.eachLayer( function( marker ) {

            var content = '<h3>' + marker.feature.properties['Tribe'] +'</h3>'

            // if ( typeof marker.feature.properties['Project'] === 'object' ) {
            //     content += "many!"
            // } else {
            //     content += '<h4>' + marker.feature.properties['Project'] + '</h4>'
            // }
            content += '<h4>' + marker.feature.properties['Project'] + '</h4>'
            //content += '<h4>' + marker.feature.properties['State'] + '</h4>'

            marker.bindPopup( content )

            marker.setIcon( L.mapbox.marker.icon({}) )

            markerclusters.addLayer( marker )

            numMarkers++
        })


        // add markers to map
        map.addLayer( markerclusters )

        // if we have markers, zoom to them, otherwise zoom out
        if ( numMarkers > 0) {
            map.fitBounds( markerclusters.getBounds() )
        } else {
            map.setView( config.mapCenter, config.mapZoom)

            alert('No projects fit the criteria.')
        }


    }

    // function mergeGeoJSONPoints( jsonArray ) {


    //     jsonArray.features.sort( function( a , b ) {

    //         if (a.geometry.coordinates > b.geometry.coordinates ) {
    //             return 1
    //         } else if ( a.geometry.coordinates < b.geometry.coordinates ) {
    //             return -1
    //         } else if ( a.geometry.coordinates == b.geometry.coordinates ) {
    //             console.log('identical coords')
    //         }

    //     })
    //     return jsonArray
    // }

    /**
     * clearMarkers -
     * @param  {object} markerLayer
     */
    function clearMarkers( markerLayer ) {
        if ( markerLayer !== undefined ) {
            map.removeLayer( markerLayer )
        } else {
            console.log('marker layer was undefined. nothing to remove.')
        }
    }




    /**
     * filterData -
     * @param  {object} feature
     * @param  {object} filters
     * @return {boolean}
     */
    function filterData( feature, filters ) {

        var bln = true

        Object.keys( filters ).forEach( function( filter ) {

            var props = feature.properties[ filter ].split(',') // convert comma separated string to array

            bln = bln && matches( props, filters[ filter ] )

        })

        return bln

    }


    /**
     * matches - check if any of the criteria match our properties
     *
     * @param  {array} needles list of properties of an object
     * @param  {array} haystack array containing a list of criteria we're looking for
     *
     * @return {boolean} true if any of needles are in haystack
     */
    function matches( needles, haystack ){

        var ismatch = true

        if ( haystack.length ) {

            ismatch = haystack.some( function( option ) {
                return needles.indexOf( option ) >= 0
            })

        }

        return ismatch

    }


    /**
     * filterDataTable -
     * @param  {[type]} terms [description]
     *
     */
    function filterDataTable() {


        Object.keys( config.uiFilters ).forEach( function( filter ){

            var idx = config.dataHeaders.indexOf( filter )
              , term = config.uiFilters[ filter ].join('|') // convert array to pipe-separated string for regex search

            datatable.column( idx ).search( term, true, false )

        })

        datatable.draw()
    }

    // delegated event handler for when inputs are built out and changed
    $('#ui-controls').on( 'change','input, select', function(e){
        clearMarkers( markerclusters )
        getFilterValues()
        renderMapMarkers( data )
        filterDataTable()
    })
