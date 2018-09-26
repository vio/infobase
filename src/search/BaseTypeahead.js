import 'react-bootstrap-typeahead/css/Typeahead.css';
// Uncomment followingl ine once we've moved to bootstrap4
// import 'react-bootstrap-typeahead/css/Typeahead-bs4.css';
import './BaseTypeahead.scss';

import { 
  Typeahead,
  Highlighter,
  Menu,
  MenuItem,
} from 'react-bootstrap-typeahead';

import { get_static_url } from '../core/request_utils.js';
import { trivial_text_maker } from '../models/text.js';

export class BaseTypeahead extends React.Component {
  componentDidMount(){
    this.typeahead.componentNode
      .querySelector(".rbt-input-hint-container")
      .insertAdjacentHTML(
        'beforeend', 
        `<div class="search-icon-container">
          <span 
            aria-hidden="true"
          >
          <img src="${get_static_url("svg/search.svg")}" style="width:30px;height:30px;" />
          </span>
        </div>`
      );
  }
  render(){
    const {
      placeholder,
      minLength,
      large, 
      onNewQuery,
      onSelect, 
      search_configs,
    } = this.props;
    
    const bootstrapSize = large ? "large" : "small";
    const debouncedOnQueryCallback = _.isFunction(onNewQuery) ? _.debounce(onNewQuery, 750) : _.noop;

    const config_groups = _.map(
      search_configs,
      (search_config, ix) => ({
        group_header: search_config.header_function(),
        group_filter: search_config.filter,
      })
    );

    const all_options = _.flatMap( 
      search_configs,
      (search_config, ix) => _.map(
        search_config.get_data(),
        data => ({
          data,
          name: search_config.name_function(data),
          config_group_index: ix,
        })
      )
    );
    
    const filterBy = (option, props) => {
      const query = props.text;
      const group_filter = config_groups[option.config_group_index].group_filter;
      return group_filter(query, option.data);
    };

    return (
      <Typeahead
        ref={(ref) => this.typeahead = ref}
        labelKey = "name"
        maxResults = { Infinity }
        emptyLabel = { "TODO: need text key for no matches found" }
        placeholder = { placeholder }
        minLength = { minLength }
        bsSize = { bootstrapSize }

        // API's a bit vague here, this onChange is "on change" set of options selected from the typeahead dropdown. Selected is an array of selected items,
        // but BaseTypeahead will only ever use single selection, so just picking the first (and, we'd expect, only) item and passing it to onSelect is fine
        onChange = { 
          (selected) => {
            if (selected.length){
              this.typeahead.getInstance().clear();
            }
            if ( _.isFunction(onSelect) && selected.length === 1 ){
              onSelect(selected[0].data);
            }
          }
        } 
        
        // This is "on change" to the input in the text box
        onInputChange = { (text) => debouncedOnQueryCallback(text) } 

        // API's a bit vague here, options is the data to search over, not a config object
        options = { all_options } 

        filterBy = { filterBy }
        renderMenu = {
          (results, menuProps) => (
            <Menu {...menuProps}>
              {
                _.chain(results)
                  .groupBy("config_group_index")
                  .thru(
                    (grouped_results) => {
                      let index_key_counter = 0;
                      const group_count = _.keys(grouped_results).length;
                      return _.flatMap(
                        grouped_results,
                        (results, group_index) => [
                          group_count > 1 && (
                            <Menu.Header key={`header-${group_index}`}>
                              {config_groups[group_index].group_header}
                            </Menu.Header>
                          ),
                          ..._.map(
                            results, 
                            (result) => {
                              const index = index_key_counter++;
                              return (
                                <MenuItem key={index} position={index} option={result}>
                                  <span dangerouslySetInnerHTML={{__html: result.name}}/>
                                </MenuItem>
                              );
                            }
                          ),
                        ]
                      );
                    }
                  )
                  .value()
              }
            </Menu>
          )
        }
      />
    );
  }
}

BaseTypeahead.defaultProps = {
  placeholder: trivial_text_maker("org_search"),
  minLength: 3,
  large: true,
}