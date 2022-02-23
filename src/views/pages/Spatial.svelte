<script lang="ts">
  import {
    load,
    ready,
    matches,
    selected,
    details,
    geojson,
    thematics,
    collections,
    nameColumns
  } from "../../stores/spatial";
  import { onMount } from "svelte";
  import Loading from "../components/Loading.svelte";
  import Table from "../components/Table.svelte";
  import Map from "../components/Map.svelte";
  import bbox from "@turf/bbox";
  import {LngLatBounds} from "mapbox-gl";

  let map;
  let mapReady;
 
  onMount(() => {
    if (!$ready) {
      load();
    }
  });

  const reload = () => {
    load();
  };

  $: localReady = $ready;

  $: transformedMatches = $matches.map(m => {
    return {
      difference: JSON.stringify(m.difference),
      matches: JSON.stringify(m.matches),
      matches_count: JSON.stringify(m.matches_count),
      id: m.id,
      file: m.file,
      tableName: m.table_name,
      message: m.message,
      import_id: m.import_id,
    };
  });

  const matchColumns = [
    {name: 'ID', key: 'id'},
    {name: 'Table Name', key: 'tableName'},
    {name: 'Message', key: 'message'},
    {name: 'Import ID', key: 'import_id'},
    {name: 'Matches', key: 'matches'},
    {name: 'Matches Count', key: 'matches_count'},
    {name: 'Difference', key: 'difference'},
    {name: 'File', key: 'file'},
  ];

  const loadDetails = row => {
    selected.set(row.id);
  };

  const detailsColumns = [
    {key: 'file', name: 'File'},
    {key: 'url', name: 'URL'},
    {key: 'name', name: 'Name'},
    {key: 'file_name', name: 'File Name'},
    {key: 'description', name: 'Description'},
    {key: 'function', name: 'Function'},
    {key: 'abstract', name: 'Abstract'},
    {key: 'format', name: 'Format'},
  ];

  $: if (mapReady) {
    map.addSource('matchData', {
      'type': 'geojson',
      'data': {"type": "FeatureCollection", "features": []}
    });

    map.addLayer({
      'id': 'matchData-line',
      'type': 'line',
      'source': 'matchData',
      'layout': {},
      'paint': {
        'line-color': '#ff0000',
        'line-opacity': 0.9,
        'line-width': 2
      }
    });

    map.addLayer({
      'id': 'matchData-circle',
      'type': 'circle',
      'source': 'matchData',
      'layout': {},
      'paint': {
        'circle-color': '#ff0000',
        'circle-opacity': 0.9,
        'circle-radius': 2
      }
    });
  }

  geojson.subscribe(_geojson => {
    if (map && _geojson) {
      map.getSource('matchData').setData(_geojson);
      const bboxCoords = bbox(_geojson);

      const bounds = new LngLatBounds(
        [bboxCoords[0], bboxCoords[1]],
        [bboxCoords[2], bboxCoords[3]]
      );
  
      map.fitBounds(bounds, {
        padding: 20,
        duration: 50
      });
    }
  });

  const setXPlan = () => {
    if ($selected) {
      fetch(`http://localhost:${__global.env.SPATIAL_PORT}/matches/setxplan/${$selected}`)
        .then(() => {
          $selected = null;
          reload();
        });
    }
  };

  let resetListSelection;
  let listSelection = [];

  const setGroupXPlan = async () => {
    if (listSelection.length > 0) {
      for (let i = 0; i < listSelection.length; i += 1) {
        await fetch(`http://localhost:${__global.env.SPATIAL_PORT}/matches/setxplan/${listSelection[i].id}`);
      }
      resetListSelection();
      reload();
    }
  };

  let thematic = '';
  let thematicSelection = null;
  const setThematic = () => {
    if (thematic === '' && (!thematicSelection || thematicSelection === 'new')) {
      alert('Please insert a thematic');
    } else {
      let thematicSubmit = thematicSelection;
      if (!thematicSelection || thematicSelection === 'new') {
        thematicSubmit = thematic;
      }
      fetch(`http://localhost:${__global.env.SPATIAL_PORT}/matches/setthematic/${$selected}?thematic=${thematicSubmit}`)
          .then(() => {
            thematic = '';
            reload();
          });
    }
  };

  let groupThematic = '';
  let groupThematicSelection = null;
  const setGroupThematic = async () => {
    if (groupThematic === '' && (!groupThematicSelection || groupThematicSelection === 'new')) {
      alert('Please insert a thematic');
    } else {
      let groupThematicSubmit = groupThematicSelection;
      if (!groupThematicSelection || groupThematicSelection === 'new') {
        groupThematicSubmit = groupThematic;
      }
      if (listSelection.length > 0) {
        for (let i = 0; i < listSelection.length; i += 1) {
          await fetch(`http://localhost:${__global.env.SPATIAL_PORT}/matches/setthematic/${listSelection[i].id}?thematic=${groupThematicSubmit}`);
        }
        resetListSelection();
        thematic = '';
        reload();
      }
    }
  };

  let classifyMethod = 'new';
  let collectionName = '';
  let collectionSelection = null;
  let nameColumn = null;
  const setClassify = () => {
    console.log(classifyMethod);
    switch (classifyMethod) {
      case 'new':
        fetch(`http://localhost:${__global.env.SPATIAL_PORT}/import/new/?id=${$selected}&name=${collectionName}&nameColumn=${nameColumn}`)
          .then(() => {
            collectionName = '';
            reload();
          });
        break;
      case 'add':
        fetch(`http://localhost:${__global.env.SPATIAL_PORT}/import/add/?id=${$selected}&name=${collectionName}&nameColumn=${nameColumn}&collectionId=${collectionSelection}`)
          .then(() => {
            collectionName = '';
            reload();
          });
        break;
      case 'update':
        break;
      case 'merge-skip':
        break;
      case 'merge-replace':
        break;
    }
  };

</script>

{#if localReady}
  <div id="match-container">
    <div id="match-left">
      <div id="match-controls">
        <button on:click={reload}>Refresh</button>
      </div>
      <div id="match-list">
        <div>
          <button on:click={setGroupXPlan}>Set XPlan</button>
          <button on:click={setGroupThematic}>Set Thematic</button>
          <input type="text" bind:value={groupThematic} />
          <select bind:value={groupThematicSelection}>
            <option value="new">New Thematic or Choose below</option>
            {#each $thematics as thematic}
              <option value={thematic.id}>{thematic.group} - {thematic.name}</option>
            {/each}
          </select>
          <button>Drop</button>
        </div>
       <Table bind:resetSelection={resetListSelection} values={transformedMatches} columns={matchColumns} click={loadDetails} selectable={true} bind:selection={listSelection} />
      </div>
      <div id="match-details">
        {#if $details && $selected}
        <div>
          <button on:click={setXPlan}>Set XPlan</button>
          <button on:click={setThematic}>Set Thematic</button>
          <input type="text" bind:value={thematic} />
          <select bind:value={thematicSelection}>
            <option value="new">New Thematic or Choose below</option>
            {#each $thematics as thematic}
              <option value={thematic.id}>{thematic.group} - {thematic.name}</option>
            {/each}
          </select>
          <button>Drop</button>
          <button on:click={setClassify}>Classify</button>
          <select bind:value={classifyMethod}>
            <option value="new">New</option>
            <option value="add">Add</option>
            <option value="update">Update</option>
            <option value="merge-skip">Merge-Skip</option>
            <option value="merge-replace">Merge-Replace</option>
          </select>
          <input type="text" bind:value={collectionName} />
          <select bind:value={collectionSelection}>
            {#each $collections as collection}
              <option value={collection.id}>{collection.name}</option>
            {/each}
          </select>
          <select bind:value={nameColumn}>
            {#each $nameColumns as column}
              <option value={column.name}>{column.name}, {column.type} ({column.udt})</option>
            {/each}
          </select>
        </div>
        <Table values={$details} columns={detailsColumns} />
        {/if}
      </div>
    </div>
    <div id="match-map">
      <Map bind:map={map} bind:mapReady={mapReady} />
    </div>
  </div>
{:else}
  <Loading text="Loading data..." />
{/if}

<style lang="scss">
  #match-container {
    display: flex;
    flex-direction: row;
    align-items: stretch;
    width: 100%;
    height: calc(100vh - 70px);
  }

  #match-left{
    display: flex;
    flex: 1;
    flex-direction: column;
    align-items: stretch;
    flex-grow: 1;
    max-width:50%;
  }

  #match-list{
    flex: 1;
    overflow: scroll;
    flex-grow:1;
  }

  #match-details{
    flex: 1;
    flex-grow:1;
    overflow:scroll;
  }

  #match-map{
    flex: 1;
    flex-grow: 1;
    display:flex;
    flex-direction: row;
    align-items: stretch;
  }
</style>