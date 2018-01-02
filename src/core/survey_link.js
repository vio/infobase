const {text_maker} = require('../models/text.js');

function should_add_survey_banner(){
  //if we add more surveys, we can use 'opened/ignored_survey1'
  if(window.has_local_storage && (window.localStorage.getItem('ignored_survey1') || window.localStorage.getItem('opened_survey1') )) {

    return false;

  } else {
    const should_randomly_add_survey = _.random(1,10) > 8;
    return should_randomly_add_survey;
  }
}


function add_survey_banner(){
  document.querySelector('#survey_link_container').innerHTML = `
    <div class="container">
      <div class="survey-link-box">
        <div class="survey-link-content-container">
          ${text_maker("survey_link_text")}
        </div>
        <div class="survey-link-close-container">
          <button 
            class="button-unstyled survey-close"
            aria-label="close"
          >
            <span aria-hidden="true" class="glyphicon glyphicon-remove">
            </span>
          </button>
        </div> 
      </div> 
    </div>
  `;

  $('#survey_link_container .survey-link').on('click', function(){
    //allow propogation for external link to open
    //TODO: record that survey link was open
    if(window.has_local_storage){
      window.localStorage.setItem('opened_survey1', true)
    }
    setTimeout(()=>{
      remove_survey_banner();
    });

  });

  $('#survey_link_container .survey-close').on('click', function(){
    //TODO: record that it was closed
    if(window.has_local_storage){
      window.localStorage.setItem('ignored_survey1', true)
    }
    setTimeout(()=>{
      remove_survey_banner();
    });

  });
}

function remove_survey_banner(){
  document.querySelector('#survey_link_container').innerHTML = "";
}

module.exports = {
  add_survey_banner,
  should_add_survey_banner,
};
