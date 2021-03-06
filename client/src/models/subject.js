import {
  Gov,
  Dept,
  CRSO,
  Program,
  InstForm,
  Ministry,
  Minister,
} from './organizational_entities.js';
import { Tag } from './tags.js';
import { 
  Result,
  Indicator,
  SubProgramEntity,
} from './results.js';
import { BudgetMeasure } from './budget_measures.js';


const Subject = {
  Gov,
  Dept,
  CRSO,
  Program,
  InstForm,
  Ministry,
  Minister,
  Tag,
  Result,
  Indicator,
  SubProgramEntity,
  BudgetMeasure,
};


Subject.get_by_guid = function get_by_guid(guid){
  if(!_.isString(guid)){ return null; }
  let [model_type, model_id] = guid.split('_');
  return Subject[model_type] && Subject[model_type].lookup(model_id);
};

// Duplicate keys in all lower case, for legacy reasons
_.each(Subject, (subject_item, key) => {
  const lower_case_key = _.toLower(key);
  if ( _.chain(Subject).keys().indexOf(lower_case_key).value() === -1 ){
    Subject[lower_case_key] = subject_item;
  }
});


window._DEV_HELPERS.Subject = Subject;

export { Subject };

