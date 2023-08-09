import ffetch from './ffetch.js';

function titleToName(name) {
  return name.toLowerCase().replace(' ', '-');
}

const taxonomyEndpoint = '/taxonomy.json';
let taxonomyPromise;
function fetchTaxonomy() {
  if (!taxonomyPromise) {
    taxonomyPromise = new Promise((resolve, reject) => {
      (async () => {
        try {
          const taxonomyJson = await ffetch(taxonomyEndpoint).all();
          const taxonomy = {};
          let curType;
          let l1;
          let l2;
          let l3;
          taxonomyJson.forEach((row) => {
            if (row.Type) {
              curType = row.Type;
              taxonomy[curType] = {
                title: curType,
                name: titleToName(curType),
                path: titleToName(curType),
                hide: row.hide,
              };
            }

            if (row['Level 1']) {
              l1 = row['Level 1'];
              taxonomy[curType][l1] = {
                title: l1,
                name: titleToName(l1),
                path: `${titleToName(curType)}/${titleToName(l1)}`,
                hide: row.hide,
              };
            }

            if (row['Level 2']) {
              l2 = row['Level 2'];
              taxonomy[curType][l1][l2] = {
                title: l2,
                name: titleToName(l2),
                path: `${titleToName(curType)}/${titleToName(l1)}/${titleToName(l2)}`,
                hide: row.hide,
              };
            }

            if (row['Level 3']) {
              l3 = row['Level 3'];
              taxonomy[curType][l1][l2][l3] = {
                title: l3,
                name: titleToName(l3),
                path: `${titleToName(curType)}/${titleToName(l1)}/${titleToName(l2)}/${titleToName(l3)}`,
                hide: row.hide,
              };
            }
          });
          resolve(taxonomy);
        } catch (e) {
          reject(e);
        }
      })();
    });
  }

  return taxonomyPromise;
}

/**
 * Get the taxonomy a a hierarchical json object
 * @returns {Promise} the taxonomy
 */
export default function getTaxonomy() {
  return fetchTaxonomy();
}
