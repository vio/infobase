import './BudgetMeasuresPartition.ib.yaml';

import { PartitionDiagram } from '../partition_diagram/PartitionDiagram.js';
import { formats } from '../../core/format.js';
import { text_maker } from "../../models/text";

import { budget_measures_hierarchy_factory } from './budget_measures_hierarchy_factory.js';

const formatter = node_data => " (" + formats.compact1(node_data.__value__*1000000) + ")";

const root_text_func = root_value => text_maker("budget_measures_partition_root", {root_value: root_value*1000000});

const popup_template = node_data => {
  return "TODO"; // May want to enact the planned popup template refactor before going forward with this...
}

const update_diagram = (diagram, props) => {
  diagram.configure_then_render({
    data: budget_measures_hierarchy_factory(props.first_column),
    formatter: formatter,
    root_text_func: root_text_func,
    popup_template: popup_template,
  });
}

export class BudgetMeasuresPartition extends React.Component {
  constructor(){
    super();
  }
  componentDidMount(){
    this.container = d3.select(ReactDOM.findDOMNode(this.refs.container));
    this.diagram = new PartitionDiagram(this.container, {height: 700});
    update_diagram(this.diagram, this.props);
  }
  shouldComponentUpdate(nextProps){
    update_diagram(this.diagram, nextProps);
    return false;
  }
  render(){
    return (
      <div className="budget-measures-partition" ref="container"/>
    );
  }
}