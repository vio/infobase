// see [here](../table_definition.html) for description
// of the table spec

import text from './orgVoteStatEstimates.yaml';
import * as FORMAT from '../core/format';
import { 
  vote_stat_dimension,
  trivial_text_maker, 
  major_vote_big_stat, 
  Statistics, 
  year_templates,
  businessConstants,
} from './table_common';
const { estimates_years } = year_templates;
const est_cols = _.map(estimates_years, yr => yr+"_estimates");
const in_year_col = est_cols[4];
const last_year_col = est_cols[3];

const { estimates_docs } = businessConstants;

const map_helper = {
  "ME": "MAINS",
  "CONT": "V5",
  "COMP": "V15",
  "GWIDE": "V10",
  "PAYL": "V30",
  "OBCF": "V25",
  "CBCF": "V33",
};

export default {
  text,
  id: "orgVoteStatEstimates",
  legacy_id: "table8",
  tags: [
    "AUTH",
    "EST_PROC",
    "VOTED",
    "STAT",
  ],


  source: ["ESTIMATES"],

  "name": { 
    "en": "Tabled Estimates",
    "fr": "Budgets déposés",
  },

  "title": {
    "en": "Tabled Estimates ($)",
    "fr": "Budgets déposés (en dollars)",
  },

  "footnote-topics": {
    "group": ["mains_text"],
    "table": ["~main_text","mains_text_gov"],
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
      "type": "int",
      "key": true,
      "hidden": true,
      'nick': "votenum",
      "header": {
        "en": "Vote / Statutory Number",
        "fr": "Crédit / Poste législatif Numéro",
      },
    });
    this.add_col({
      "type": "int",
      "key": true,
      "hidden": true,
      "nick": "votestattype",
      "header": '',
    });
    this.add_col({
      "type": "wide-str",
      "key": true,
      "nick": "desc",
      "header": {
        "en": "Vote / Statutory Description",
        "fr": "Crédit / Poste législatif Description",
      },
    });
    this.add_col({
      "type": "wide-str",
      "key": true,
      "hidden": true,
      "nick": "est_doc_code",
      "header": {
        "en": "Estimates",
        "fr": "Budget des dépenses",
      },
    });
    this.add_col({
      "type": "wide-str",
      "key": true,
      "nick": "est_doc",
      "header": {
        "en": "Estimates Instrument",
        "fr": "Instrument des dépenses",
      },
    });
    _.each(estimates_years, (yr, ix) => { 
      this.add_col({
        "simple_default": ix === 4,
        type: "big_int",
        nick: yr+"_estimates",
        description: {
          en: "Tabled Amounts for "+yr,
          fr: "Montants déposés pour "+yr,
        },
        header: yr,
      });
    });
  },

  "mapper": function (row) {	 

    if (row[5] in map_helper) { 
      row[5] = map_helper[row[5]]; 
    }
    row.splice(6, 0, estimates_docs[row[5]][window.lang]);
	
    if (this.lang === 'en') {
      row.splice(4, 1);
    } else {
      row.splice(3, 1);
    }
    if ( _.isNaN(+row[1]) ){
      row[1] = 'S';
      row[2] = 999;
    } else {
      row[3] = row[3] + " - " + row[1];
    }

    // remove acronym and vote type
    return row;
  },

  "queries": {
    "estimates_split": function(options,format){
      format = format || false;
      const col = options.col || in_year_col;
      var filter = options.filter;
      var add_percentage = options.add_percentage || false;
      var filter_zeros = options.filter_zeros || false;
      var compress_carry_fws = options.compress_carry_fws || false;
      var total = this.sum(col)+1;
      var dept = this.dept || false;
      var dimension = "by_estimates_doc";
      if (compress_carry_fws){
        dimension = "by_estimates_doc_compressed";
      }
      return _.chain(this.table[dimension](col,dept,false))
        .toPairs()
        .sortBy(function(est_doc_lines){
          var first_line = est_doc_lines[1][0];
          return estimates_docs[first_line.est_doc_code].order;
        })
        .map((est_doc_lines)=>{
          var est_doc = est_doc_lines[0];
          var est_lines = est_doc_lines[1];
          var est_amnt ; 
          // filter out lines of a provided vote number (this won't work for stat items)
          if (filter){
            est_lines = _.filter(est_lines, filter);
          } 
          est_amnt = d3.sum(_.map(est_lines, col));
          if (add_percentage) {
            return [est_doc, est_amnt, est_amnt/total];
          } else {
            return [est_doc, est_amnt];
          }
        })
        .filter(function(row){
          if (filter_zeros){
            return row[1] !== 0;
          } else {
            return true;
          }
        })
        .map(function(row){
          if (format) {
            if (add_percentage) {
              return FORMAT.list_formatter(["", "big-int", "percentage"], row);
            } else {
              return FORMAT.list_formatter(["", "big-int"], row);
            }
          }
          return row;
        })
        .value();
    },
  },

  "sort": function (mapped_rows, lang) {
    var grps = _.groupBy(mapped_rows, function (row) { 
      return _.isNumber(row.votenum);
    });
      // grps[true]  ==> voted rows
      // grps[false] ==> stat rows
    if ( _.has(grps, false) ){
      grps[false] = _.sortBy(grps[false], function (row) { return row[0]; });
    } else {
      grps[false] = [];
    }
    if ( _.has(grps, true) ){
      grps[true] = _.sortBy(grps[true], function (row) { 
        return row.votenum; 
      });
    } else {
      grps[true] = [];
    }
    return grps[true].concat(grps[false]);
  },

  "dimensions": [
    {
      title_key: "by_estimates_doc",
      include_in_report_builder: true,
      filter_func: function(options){
        return function(d){
          return d.est_doc;
        };
      },
    },
    {
      title_key: "voted_stat",
      include_in_report_builder: true,
      filter_func: vote_stat_dimension,
    },
    {
      title_key: "major_voted_big_stat",
      exclude_from_rpb: true,
      filter_func: major_vote_big_stat("{{est_in_year}}_estimates"),
    },
  ],
};

Statistics.create_and_register({
  id: 'orgVoteStatEstimates_dept_info', 
  table_deps: [ 'orgVoteStatEstimates'],
  level: 'dept',
  compute: (subject, tables, infos, add, c) => {
    c.dept = subject;
    const table = tables.orgVoteStatEstimates;
    const q = table.q(subject);
    const voted = trivial_text_maker("voted");
    const stat = trivial_text_maker("stat");
    add("voted_est_in_year",table.voted_stat(in_year_col,c.dept, true)[voted] || 0);
    add("stat_est_in_year",table.voted_stat(in_year_col,c.dept, true)[stat] || 0);
    _.each(est_cols, yr => {
      add("tabled_"+yr, q.sum(yr));
    });

    const voted_in_mains = d3.sum(
      _.filter(q.data, row => _.isNumber(row.votenum) && row.est_doc_code === "MAINS"),
      _.property(in_year_col)
    );

    add('tabled_voted_mains_est_in_year', voted_in_mains);

    add('in_year_estimates_split', q.estimates_split({filter_zeros: true, as_tuple: true, col: in_year_col}) );
    add('last_year_estimates_split', q.estimates_split({filter_zeros: true, as_tuple: true, col: last_year_col}) );
  
    add({
      "key": "voted_percent_est_in_year" ,
      "value": c.dept_voted_est_in_year/c.dept_tabled_est_in_year_estimates,
      "type": "percentage1",
    });
    add({
      "key": "stat_percent_est_in_year" ,
      "value": c.dept_stat_est_in_year/c.dept_tabled_est_in_year_estimates,
      "type": "percentage1",                                    
    });
  },
});

Statistics.create_and_register({
  id: 'orgVoteStatEstimates_gov_info', 
  table_deps: [ 'orgVoteStatEstimates'],
  level: 'gov',
  compute: (subject, tables, infos, add, c) => {
    const table = tables.orgVoteStatEstimates;
    const q = table.q(subject);
    const voted = trivial_text_maker("voted");
    const stat = trivial_text_maker("stat");
    const dept_number = _.chain(table.depts)
      .keys()
      .filter(function(key){
        return table.q(key).sum("est_in_year_estimates") !== 0;
      })
      .value()
      .length;
    const _voted_num_in_year = _.chain(table.voted_stat("est_in_year_estimates", false,false)[voted]) 
      .filter(function(row){
        return row.est_in_year_estimates !== 0;
      })
      .groupBy(function(row){
        return row.dept +row.votenum;
      });
    const voted_num_in_year = _voted_num_in_year
      .keys()
      .value()
      .length;
    const voted_central_num_in_year = _voted_num_in_year
      .filter(function(lines, key){
        return lines[0].votestattype === 6;
      })
      .value()
      .length;

    const voted_in_mains = d3.sum(
      _.filter(table.data, row => _.isNumber(row.votenum) && row.est_doc_code === "MAINS"),
      _.property(in_year_col)
    );
    add('tabled_voted_mains_est_in_year', voted_in_mains);

    add("dept_number", dept_number);
    add("voted_num_est_in_year",voted_num_in_year);

    add("voted_central_num_est_in_year",voted_central_num_in_year);
    add("voted_non_centralnum_est_in_year",voted_num_in_year - voted_central_num_in_year);

    add("voted_est_in_year",table.voted_stat(in_year_col,false)[voted] || 0);
    add("stat_est_in_year",table.voted_stat(in_year_col,false)[stat] || 0);

    add('in_year_estimates_split', q.estimates_split({filter_zeros: true, as_tuple: true, col: in_year_col}) );
    add('last_year_estimates_split', q.estimates_split({filter_zeros: true, as_tuple: true, col: last_year_col}) );

    _.each(estimates_years, yr=> { add("tabled_"+yr, q.sum(yr+"_estimates")); } );
    
    add({
      "key": "voted_percent_est_in_year" ,
      "value": c.gov_voted_est_in_year/c.gov_tabled_est_in_year,
      "type": "percentage",
    });
    add({
      "key": "stat_percent_est_in_year" ,
      "value": c.gov_stat_est_in_year/c.gov_tabled_est_in_year,
      "type": "percentage",
    });

  },
});
