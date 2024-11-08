import React, { useState, useEffect } from 'https://cdn.skypack.dev/react';
import ReactDOM from 'https://cdn.skypack.dev/react-dom';
import {
  Container,
  Button,
  Tabs,
  Tab,
  Box,
  TextField,
  Typography,
  FormControl,
  InputLabel,
  InputBase,
  Grid,
} from 'https://cdn.skypack.dev/@material-ui/core';
import { styled } from 'https://cdn.skypack.dev/@material-ui/styles';

const StyledTabs = styled(Tabs)({
  borderBottom: "1px solid #e8e8e8",
  "& .MuiTabs-indicator": {
    backgroundColor: "#799967",
  },
});

const StyledTab = styled((props) => <Tab disableRipple {...props} />)(
  ({ theme }) => ({
    textTransform: "none",
    minWidth: 0,
    //fontWeight: theme.typography.fontWeightRegular,
    //marginRight: theme.spacing(1),
    color: "rgba(0, 0, 0, 0.85)",
    fontFamily: [
      "-apple-system",
      "BlinkMacSystemFont",
      '"Segoe UI"',
      "Roboto",
      '"Helvetica Neue"',
      "Arial",
      "sans-serif",
      '"Apple Color Emoji"',
      '"Segoe UI Emoji"',
      '"Segoe UI Symbol"',
    ].join(","),
    "&:hover": {
      color: "#799967",
      opacity: 1,
    },
    "&.Mui-selected": {
      color: "#799967",
      //fontWeight: theme.typography.fontWeightMedium,
    },
    "&.Mui-focusVisible": {
      backgroundColor: "#79996711",
    },
  })
);

const StyledInput = styled(InputBase)(({ theme }) => ({
  "label + &": {
    marginTop: 20,
  },
  "& .MuiInputBase-input": {
    borderRadius: 4,
    position: "relative",
    border: "1px solid",
    borderColor: "#d0d0d0",
    fontSize: 14,
    padding: "6px 12px",
    // Use the system font instead of the default Roboto font.
    fontFamily: [
      "-apple-system",
      "BlinkMacSystemFont",
      '"Segoe UI"',
      "Roboto",
      '"Helvetica Neue"',
      "Arial",
      "sans-serif",
      '"Apple Color Emoji"',
      '"Segoe UI Emoji"',
      '"Segoe UI Symbol"',
    ].join(","),
    "&:focus": {
      //boxShadow: `${alpha(theme.palette.primary.main, 0.25)} 0 0 0 0.2rem`,
      borderColor: "blue",
    },
  },
}));

const TabbedForm = ({ schema, onUpdate }) => {
  const [formData, setFormData] = useState({});
  const [activeTab, setActiveTab] = useState(0);
  useEffect(() => {
    onUpdate({ schema, formData });
 }, [formData]);

  if (!schema || !schema.properties) return (<div>Loading...</div>);

  const handleChange = (tabIndex) => {
    setActiveTab(tabIndex);
  };

  const handleInputChange = (key, value) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Function to retrieve the form content in a flat format
  const getFormData = () => {
    return formData;
  };

  // Recursive function to render groups and nested groups
  const renderGroup = (group, parentKey = "") => {
    return (
      <Grid container spacing={2}>
        {Object.keys(group.properties).map((key) => {
          const item = group.properties[key];
          const flatKey = item.attr_id
            ? new String(item.attr_id).startsWith("src_")
              ? item.attr_id
              : `attr_${item.attr_id}`
            : parentKey
              ? `${parentKey}_${key}`
              : key;

          if (item.type === "group") {
            return (
              <Grid item xs={12} key={flatKey}>
                <Typography
                  variant="h6"
                  style={
                    item.styles || {
                      fontSize: 14,
                      fontWeight: 600,
                      marginBottom: "8px",
                      marginTop: "8px",
                    }
                  }
                  gutterBottom
                >
                  {item.label}
                </Typography>
                {renderGroup(item, flatKey)}
              </Grid>
            );
          } else if (item.type === "textinput") {
            return (
              <Grid item xs={12} key={flatKey}>

                {/*
                <TextField
                  fullWidth
                  label={item.label}
                  placeholder={item.placeholder}
                  onChange={(e) => handleInputChange(flatKey, e.target.value)}
                  value={formData[flatKey] || ""}
                />
                */}
                <FormControl fullWidth variant="standard">
                  <InputLabel shrink htmlFor="bootstrap-input">
                    {item.label}
                  </InputLabel>
                  <StyledInput
                    placeholder={item.placeholder}
                    id="bootstrap-input"
                    onChange={(e) => handleInputChange(flatKey, e.target.value)}
                    value={formData[flatKey] || ""}
                  />
                </FormControl>
              </Grid>
            );
          } else if (item.type === "text") {
            return (
              <Grid item xs={12} key={flatKey}>
                <Typography
                  style={item.styles || { fontSize: 14, fontWeight: 400 }}
                >
                  {item.value}
                </Typography>
              </Grid>
            );
          }
          return null;
        })}
      </Grid>
    );
  };

  return (
    <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
      <StyledTabs
        value={activeTab}
        onChange={(e, newValue) => handleChange(newValue)}
        variant="scrollable"
        scrollButtons="auto"
        textColor="#799967"
      >
        {Object.keys(schema.properties).map((groupKey, index) => (
          <StyledTab key={groupKey} label={schema.properties[groupKey].label} />
        ))}
      </StyledTabs>
      <Box
        mt={2}
        sx={{
          padding: "4px 14px",
          maxWidth: "800px",
          margin: "auto"
        }}
      >
        {Object.keys(schema.properties).map((groupKey, index) => (
          <Box key={groupKey} hidden={activeTab !== index}>
            {renderGroup(schema.properties[groupKey])}
          </Box>
        ))}
      </Box>
    </Box>
  );
};


const MyCustomComponent = ({ data, updateData, runQuery }) => {
  return (
    <TabbedForm schema={data.schema} onUpdate={updateData} />
  );
}

const ConnectedComponent = Tooljet.connectComponent(MyCustomComponent);
ReactDOM.render(<ConnectedComponent />, document.body);