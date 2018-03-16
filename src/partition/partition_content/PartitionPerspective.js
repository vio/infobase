export class PartitionPerspective {
  constructor(args){
    
    const required_args = {
      id: args.id,
      name: args.name,
      data_type: args.data_type,
      formater: args.formater,
      hierarchy_factory: args.hierarchy_factory,
      popup_template: args.popup_template,
      root_text_func: args.root_text_func,
    };
    
    const required_arg_is_missing = _.some(_.values(required_args), arg => _.isNull(arg) || _.isUndefined(arg));

    if (required_arg_is_missing){
      throw `Partition diagram perspective ${args.name} is missing required arguments.`;
    } else {
      const optional_args = {
        diagram_notes: args.diagram_notes || false,
        disable_search_bar: args.disable_search_bar || false,
      }
      Object.assign(this, required_args, optional_args);
    }
  }
}