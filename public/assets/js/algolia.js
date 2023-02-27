// Il templating che sto usando è deprecated
// va aggiunta la differenza da docenti e studenti


const { algoliasearch, instantsearch } = window;

const searchClient = algoliasearch(
  "DZAA9FW8AU",
  "c38281967fc342aba35b5434f1836ce7"
);

const search = instantsearch({
  indexName: "registro_elettronico",
  searchClient,
});

search.addWidgets([
  instantsearch.widgets.searchBox({
    container: "#searchbox",
  }),
  instantsearch.widgets.hits({
    container: "#hits",
    templates: {
      item: `
<article>
    <h2 class="display-6"><a href='/registro_docente/{{#helpers.highlight}}{ "attribute": "classe" }{{/helpers.highlight}}/medie/{{#helpers.highlight}}{ "attribute": "id" }{{/helpers.highlight}}'                  >{{#helpers.highlight}}{ "attribute": "name" }{{/helpers.highlight}}</a></h2>
</article>
`,
    },
  }),
  instantsearch.widgets.configure({
    hitsPerPage: 8,
  }),
  instantsearch.widgets.dynamicWidgets({
    container: "#dynamic-widgets",
    fallbackWidget({ container, attribute }) {
      return instantsearch.widgets.panel({ templates: { header: attribute } })(
        instantsearch.widgets.refinementList
      )({
        container,
        attribute,
      });
    },
    widgets: [],
  }),
  instantsearch.widgets.pagination({
    container: "#pagination",
  }),
]);

search.start();
