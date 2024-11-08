import React from 'https://cdn.skypack.dev/react';
  import ReactDOM from 'https://cdn.skypack.dev/react-dom';
  import { Button, Container, Accordion, AccordionSummary, AccordionDetails, Typography, Link, Tooltip, Divider, styled } from 'https://cdn.skypack.dev/@material-ui/core';

const StyledAccordion = styled((props: AccordionProps) => (
  <Accordion disableGutters elevation={0} {...props} />
))(({ theme }) => ({
  border: `none`,
  "&:not(:last-child)": {
    borderBottom: 0,
  },
  "&::before": {
    display: "none",
  },
}));

const StyledAccordionSummary = styled((props: AccordionSummaryProps) => (
  <AccordionSummary {...props} />
))(({ theme }) => ({
  //backgroundColor: "rgba(0, 0, 0, .03)",
  borderBottom: `1px solid #e0e0e0`,
  flexDirection: "row-reverse",
  "& .MuiAccordionSummary-expandIconWrapper.Mui-expanded": {
    transform: "rotate(180deg)",
  },
  "& .MuiAccordionSummary-content": {
    marginLeft: theme.spacing(1),
  }
}));

const StyledAccordionDetails = styled(AccordionDetails)(({ theme }) => ({
  padding: theme.spacing(2),
  borderTop: "1px solid rgba(0, 0, 0, .125)",
  backgroundColor: "rgba(0, 0, 0, .03)",
}));

// Component to display the attributes
const SpeciesAttributesDisplay = ({ attributes }) => {
  if (!attributes || attributes.length === 0) {
    return (
      <Typography variant="h6" align="center" color="textSecondary">
        Keine Attribute verfügbar
      </Typography>
    );
  }

  // Grouping the attributes by level 1 and level 2
  attributes = attributes.filter(
    (attribute) => !!attribute.SpeciesAttributes_attribute_value
  );

  const groupedAttributes = attributes.reduce((acc, attribute) => {
    const level1 =
      attribute.SpeciesAttributeDefinitions_level1_category_display_name;
    const level2 =
      attribute.SpeciesAttributeDefinitions_level2_category_display_name;

    if (!acc[level1]) acc[level1] = {};
    if (!acc[level1][level2]) acc[level1][level2] = [];

    acc[level1][level2].push(attribute);
    return acc;
  }, {});

  return (
    <div>
      {Object.keys(groupedAttributes).map((level1Key) => (
        <StyledAccordion key={level1Key}>
          <StyledAccordionSummary>
          <Typography variant="h5" style={{ fontSize: 20 }}>{level1Key}</Typography>
          </StyledAccordionSummary>
          <StyledAccordionDetails style={{display: "block"}}>
            {Object.keys(groupedAttributes[level1Key]).map((level2Key) => (
              <div key={level2Key} style={{ marginBottom: "16px" }}>
                {level2Key && level2Key != "null" && (
                  <Typography variant="h6" gutterBottom>
                    {level2Key}
                  </Typography>
                )}
                {groupedAttributes[level1Key][level2Key]
                  .sort(
                    (a, b) =>
                      a.SpeciesAttributeDefinitions_primary_sort -
                      b.SpeciesAttributeDefinitions_primary_sort
                  )
                  .map((attribute) => (
                    <div
                      key={attribute.SpeciesAttributeDefinitions_id}
                      style={{ marginBottom: "12px" }}
                    >
                      {/* Display the attribute display name only if it differs from level2 */}
                      {attribute.SpeciesAttributeDefinitions_display_name !==
                        level2Key && (
                        <Tooltip
                          title={
                            attribute.SpeciesAttributeDefinitions_description
                          }
                          arrow
                        >
                          <Typography variant="h6" style={{
                              cursor: "help",
                              fontSize: 16,
                              fontWeight: "bold",
                            }}>
                            {attribute.SpeciesAttributeDefinitions_display_name}
                          </Typography>
                        </Tooltip>
                      )}
                      <Typography variant="body2">
                        {attribute.SpeciesAttributes_attribute_value}
                      </Typography>

                      {/* Tooltip for Source, if it's not null */}
                      {attribute.SpeciesAttributes_sources && (
                        <Typography
                          variant="caption"
                          style={{ color: "gray", lineHeight: "32px" }}
                        >
                          {attribute.SpeciesAttributes_sources}
                        </Typography>
                      )}
                    </div>
                  ))}
                <Divider />
              </div>
            ))}
          </StyledAccordionDetails>
        </StyledAccordion>
      ))}
    </div>
  );
};


  const MyCustomComponent = ({data, updateData, runQuery}) => (
      <SpeciesAttributesDisplay attributes={data.attributes} />
  );
  const ConnectedComponent = Tooljet.connectComponent(MyCustomComponent);
  ReactDOM.render(<ConnectedComponent />, document.body);