 window.onload = function() { init() };

    var map
      , datatable
      , data
      , markerclusters
      , config = {
            googlekey : '1PeYaVWqSWABu6kWKI3VF48_iL-YLAyFJIo9j8Hnx73Y'
          , url : 'https://docs.google.com/spreadsheet/pub'
          , qstring: '?hl=en_US&hl=en_US&output=html&key='
          , uiTitles : [ 'State', 'Technology', 'Project Category' ]
          , mapCenter: [ 39.81,-99.84 ]
          , mapZoom: 4
          , mapboxToken: 'pk.eyJ1IjoibnJlbCIsImEiOiJNOTcxYUhZIn0.Jc7TB_G2VQYs9e0S2laKcw'
          , tileLayer: 'mapbox.streets'
          , mapContainer: 'map'
          , dataHeaders: ['Project', 'Tribe', 'State', 'Year','Assistance Type', 'Project Category', 'Technology']
    }

    function init() {
        Tabletop.init({
            key: config.url+config.qstring+config.googlekey,
            callback: render,
            simpleSheet: true
        })
    }


    function render(googledata, tabletop) {
        data = googledata // make the data global

        renderMap( data )

        renderMapMarkers( data )

        buildUI( data )

        renderDataTable( data )
    }


    function buildHtmlTemplates( src, data ) {
        var tmplSrc = $( src ).html()
          , template = Handlebars.compile( tmplSrc )

        return  template(  data  )
    }


    function buildUI( data ) {
        var $ui = $('#ui-controls')
        var uiObj = {}

        // todo: refactor - this is not efficient... relooping thru data
        config.uiTitles.forEach( function( title ){

            uiObj[ title.toLowerCase().replace(/\W/g,'-') ] = data.map( function( result ){
                return result[title]
            })
            .sort()
            .filter( function( a,b,c ){ // grab unique items
                return c.indexOf(a) === b;
            })
        })

        $ui.find('[data-target]').each( function(idx, el){
            var target = '#'+ $(this).data().target + '-template'

            $(this).append( buildHtmlTemplates( target, uiObj ) )
        })
    }


    function linkTitle( data ) {
        return data.map(function( row ){
            row['Project'] = '<a href="'+row['Link']+'">'+row['Project']+'</a>'
            return row
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
      datatable = $('#datatable').DataTable({
          'aaData': linkTitle( data )
        , 'aoColumns': aoColumns
        , 'dom': dom
      })

    }


    function renderMap(){
        L.mapbox.accessToken = config.mapboxToken;

        map = L.mapbox.map( config.mapContainer )
            .setView( config.mapCenter, config.mapZoom)
            .addLayer( L.mapbox.tileLayer( config.tileLayer ) )
    }


    function renderMapMarkers( data ) {
        var numMarkers = 0

        markerclusters = new L.MarkerClusterGroup()

        // if ( markerclusters === undefined ) {
        //     markerclusters = new L.MarkerClusterGroup()
        // } else {
        //     // remove the current layer
        //     console.log('removing ', markerclusters)
        //     map.removeLayer( markerclusters )
        // }

        var geojsondata = GeoJSON.parse( data, { Point: ['Latitude','Longitude']} ); //todo: abstract out lat/lon field

        var featureLayer = L.mapbox.featureLayer().setGeoJSON( geojsondata )



        // filter data
        featureLayer.setFilter( function(feature){

            return filterData(feature)

        })



        // add markers and popup content to marchercluster group
        featureLayer.eachLayer( function( marker ) {

            var content = '<h3>' + marker.feature.properties.Technology +'</h3>' +
                          '<h4>' + marker.feature.properties['Project Category'] + '</h4>'

            marker.bindPopup( content )

            marker.setIcon( L.mapbox.marker.icon({}) )

            markerclusters.addLayer( marker )

            numMarkers++
        })


        // add markers to map and zoom
        map.addLayer( markerclusters )

        // if we have markers, zoom to them, otherwise zoom out
        if ( numMarkers > 0) {
            map.fitBounds( markerclusters.getBounds() )
        } else {
            map.setView( config.mapCenter, config.mapZoom)
            // display "no markers message"
            notify('no markers fit the criteria...')
        }


    }

    function clearMarkers() {
        if( markerclusters !== undefined )
            map.removeLayer(markerclusters)
    }

    function notify(msg) {
        alert(msg)
    }

    function filterData( feature ) {
        var mytechs = feature.properties['Technology'].split(',')
          , mycategories = feature.properties['Project Category'].split(',')
          , mystate = feature.properties['State'].split(',')
          , selectedtechs = $('#ui-controls [data-target=technology] :checked')
          , selectedcategories = $('#ui-controls [data-target=project-category] :checked')
          , selectedstate = $('#ui-controls [data-target=state] :checked')

        if ( selectedstate.val() == '') {
            selectedstate = []
        }
        return matches( mytechs, selectedtechs )
            && matches( mycategories, selectedcategories )
            && matches( mystate, selectedstate )
    }

    function matches( myoptions, selectedopts ){
        var values = []
        var ismatch = true

        if ( selectedopts.length ) {

            selectedopts.each( function(){
                values.push( this.value )
            })
        }

        if ( values.length ) {

            ismatch = values.some( function( option ) {
                return myoptions.indexOf( option ) >= 0
            })
        }

        return ismatch
    }



    function reDrawTable(){
        datatable
            .columns(2)
            .search('Alaska')
            .draw()
    }

    // delegated event handler for when inputs are built out and changed
    $('#ui-controls').on('change','input, select', function(e){
        //console.log(this.value,e)
        clearMarkers()
        renderMapMarkers( data )
        reDrawTable()
    })
