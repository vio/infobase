import text from './orgTransferPaymentsRegion.yaml';
import {
  businessConstants,
  year_templates,
} from "./table_common.js";

const { provinces } = businessConstants;
const { std_years } = year_templates;

export default {
  text,
  id: "orgTransferPaymentsRegion",
  source: ["PA"],     
  tags: [
    "TP_GEO",
    "SOBJ10",
  ],

  "link": {
    "en": "https://open.canada.ca/data/en/dataset/69bdc3eb-e919-4854-bc52-a435a3e19092",
    "fr": "https://ouvert.canada.ca/data/fr/dataset/69bdc3eb-e919-4854-bc52-a435a3e19092",
  },

  "name": {
    "en": "Transfer Payments by recipient region",
    "fr": "Paiements de transfert par région du bénéficiaire",
  },

  "title": {
    "en": "Transfer Payments by recipient region",
    "fr": "Paiements de transfert par région du bénéficiaire",
  },

  "add_cols": function(){
    this.add_col({
      "type": "int",
      "key": true,
      "hidden": true,
      "nick": "dept",
      "header": '',
    });
    this.add_col({
      "type": "short-str",
      "key": true,
      "hidden": true,
      "not_for_display": true,
      "nick": 'region_code',
      "header": "",
    });
    this.add_col({
      "key": true,
      "type": "short-str",
      "nick": 'region',
      "header": {
        "en": "Geographic Region",
        "fr": "Région géographique",
      },
    });
    _.each(
      std_years, 
      (header, ix) => {
        this.add_col({
          "simple_default": ix === 4,
          "type": "big_int",
          "nick": header,
          "header": header,
          "description": {
            "en": `Amount of transfer payment in ${header}`,
            "fr": `Montant du paiement de transfert en ${header}`,
          },
        });
      }
    );
  },

  "mapper": (row) => {
    const [org_id, prov_code, ...values] = row;
    const prov_text = provinces[prov_code].text;
    return [org_id, prov_code, prov_text, ...values];
  },

  "sort": (mapped_rows, lang) => _.sortBy(
    mapped_rows, 
    (row) => {
      if (row.region === provinces.abroad.text){
        return "Z";
      } 
      if (row.region[0] === 'Î'){
        return "I";
      }
      return row.region;
    }
  ),

  "queries": {
    "gov_grouping": () => _.chain( this.table.horizontal(std_years, false) )
      .map( (years, key) => [key].concat(years) )
      .sortBy( (row) => d3.sum( _.tail(row) ) )
      .value(),
  },

  "dimensions": [
    {
      title_key: "prov",
      filter_func: _.constant( _.property('region') ),
      include_in_report_builder: true,
    },
    {
      title_key: "prov_code",
      filter_func: _.constant( _.property('region_code') ),
    },
  ],
};