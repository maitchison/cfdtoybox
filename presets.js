/**
    I'm having trouble reading and writing XML from the local filesystem, so I've decided to just put the XML all in a file.
    later on I'll store this in a SQL server which will allow users to save their own files and will be much cleaner.
    
    By Matthew Aitchison
    2016/04/25

    Please feel free to copy / use the code as you see fit.
        
*/

var presets = []

presets.push(
    '<?xml version="1.0" encoding="ISO-8859-1" standalone="yes" ?>\n' + 
    '<Save>\n' +
	'   <Name>Sandbox</Name>\n' +
	'   <Date>1461194149330</Date>\n' +
	'   <Sensor x="75" y="30" />\n' +
    '   <Description></Description>\n' +
	'   <Settings showSensor="false" showForce="false" showTracers="false" showFlowlines="false" />\n' +
	'   <Data xdim="150" ydim="60">\n' +
	'       <Attributes>0:3176,1:6,0:142,1:3,0:4,1:3,0:139,1:2,0:8,1:2,0:137,1:2,0:10,1:2,0:135,1:2,0:12,1:2,0:134,1,0:14,1,0:133,1:2,0:14,1:2,0:132,1,0:16,1,0:132,1,0:16,1,0:132,1,0:16,1,0:132,1,0:16,1,0:132,1:2,0:14,1:2,0:133,1,0:14,1,0:134,1:2,0:12,1:2,0:135,1:2,0:10,1:2,0:137,1:2,0:8,1:2,0:139,1:3,0:4,1:3,0:142,1:6,0:3268</Attributes>\N' +    
	'   </Data>\n' +
    '</Save>\n'
    );

presets.push(
    '<?xml version="1.0" encoding="ISO-8859-1" standalone="yes" ?>\n' +
    '<Save>\n' +
	'   <Name>Experiment 1 - Lift</Name>\n' +
    '   <Description>See if you can create a wing with a lift to drag of above 2 (hint, the angle of attack matters).</Description>\n' +
	'   <Date>1461194149330</Date>\n' +
	'   <Sensor x="75" y="30" />\n' +
	'   <Settings showSensor="false" showForce="false" showTracers="false" showFlowlines="false" />\n' +
	'   <Data xdim="150" ydim="60">\n' +
	'       <Attributes>0:3322,1:63,0:83,1:61,0:87,1:59,0:90,1:58,0:92,1:53,0:97,1:48,0:102,1:44,0:107,1:40,0:111,1:31,0:120,1:26,0:125,1:19,0:133,1:15,0:4013</Attributes>\n' +    
    '       <Versions default="5">\n' +
    '           <Version name="Square">0:3164,1:16,0:134,1:16,0:134,1:16,0:134,1:16,0:134,1:16,0:134,1:16,0:134,1:16,0:134,1:16,0:134,1:16,0:134,1:16,0:134,1:16,0:134,1:16,0:134,1:16,0:134,1:16,0:134,1:16,0:134,1:16,0:3568</Version>\n' +
    '           <Version name="Line">0:3316,1,0:149,1,0:149,1,0:149,1,0:149,1,0:149,1,0:149,1,0:149,1,0:149,1,0:149,1,0:149,1,0:149,1,0:149,1,0:149,1,0:149,1,0:149,1,0:3431</Version>\n' +
    '           <Version name="Circle">0:3320,1:5,0:143,1:9,0:139,1:13,0:136,1:15,0:135,1:15,0:134,1:17,0:133,1:17,0:133,1:17,0:133,1:17,0:133,1:17,0:133,1:17,0:133,1:17,0:134,1:15,0:135,1:15,0:136,1:13,0:139,1:9,0:143,1:5,0:3273</Version>\n' +
    '           <Version name="Line With Spoiler">0:3015,1,0:149,1,0:149,1,0:149,1,0:149,1,0:149,1,0:149,1,0:149,1,0:149,1,0:149,1:44,0:106,1,0:149,1,0:149,1,0:149,1,0:149,1,0:149,1,0:149,1,0:149,1,0:3432</Version>\n' +
    '           <Version name="Wedge">0:3317,1:44,0:106,1:40,0:110,1:36,0:114,1:32,0:118,1:28,0:122,1:24,0:126,1:20,0:130,1:16,0:134,1:12,0:138,1:8,0:142,1:4,0:4177</Version>\n' +
    '           <Version name="Airfoil">0:3024,1:38,0:109,1:42,0:105,1:45,0:104,1:44,0:106,1:42,0:107,1:40,0:110,1:36,0:114,1:33,0:117,1:30,0:121,1:25,0:125,1:21,0:130,1:16,0:136,1:6,0:4173</Version>\n' +
    '           <Version name="Bullet">0:3612,1:11,0:136,1:14,0:134,1:16,0:134,1:16,0:134,1:16,0:134,1:16,0:134,1:16,0:136,1:14,0:139,1:11,0:4174</Version>\n' +    
    '       </Versions>\n' +
	'   </Data>\n' +
    '</Save>\n'
    );
    
presets.push(
    '<?xml version="1.0" encoding="ISO-8859-1" standalone="yes" ?>\n' +
    '<Save>\n' +
	'   <Name>Experiment 2</Name>\n' +
	'   <Date>1461194149330</Date>\n' +
	'   <Sensor x="75" y="30" />\n' +
	'   <Settings showSensor="false" showForce="false" showTracers="false" showFlowlines="false" />\n' +
	'   <Data xdim="150" ydim="60">\n' +
	'       <Attributes>0:3176,1:6,0:142,1:3,0:4,1:3,0:139,1:2,0:8,1:2,0:137,1:2,0:10,1:2,0:135,1:2,0:12,1:2,0:134,1,0:14,1,0:133,1:2,0:14,1:2,0:132,1,0:16,1,0:132,1,0:16,1,0:132,1,0:16,1,0:132,1,0:16,1,0:132,1:2,0:14,1:2,0:133,1,0:14,1,0:134,1:2,0:12,1:2,0:135,1:2,0:10,1:2,0:137,1:2,0:8,1:2,0:139,1:3,0:4,1:3,0:142,1:6,0:3268</Attributes>\N' +
	'   </Data>\n' +
    '</Save>\n'
    );

presets.push(
    '<?xml version="1.0" encoding="ISO-8859-1" standalone="yes" ?>\n' +
    '<Save>\n' +
	'   <Name>Experiment 3</Name>\n' +
	'   <Date>1461194149330</Date>\n' +
	'   <Sensor x="75" y="30" />\n' +
	'   <Settings showSensor="false" showForce="false" showTracers="false" showFlowlines="false" />\n' +
	'   <Data xdim="150" ydim="60">\n' +
	'       <Attributes>0:3176,1:6,0:142,1:3,0:4,1:3,0:139,1:2,0:8,1:2,0:137,1:2,0:10,1:2,0:135,1:2,0:12,1:2,0:134,1,0:14,1,0:133,1:2,0:14,1:2,0:132,1,0:16,1,0:132,1,0:16,1,0:132,1,0:16,1,0:132,1,0:16,1,0:132,1:2,0:14,1:2,0:133,1,0:14,1,0:134,1:2,0:12,1:2,0:135,1:2,0:10,1:2,0:137,1:2,0:8,1:2,0:139,1:3,0:4,1:3,0:142,1:6,0:3268</Attributes>\N' +
	'   </Data>\n' +
    '</Save>\n'
    );

presets.push(
    '<?xml version="1.0" encoding="ISO-8859-1" standalone="yes" ?>\n' +
    '<Save>\n' +
	'   <Name>Experiment 4</Name>\n' +
	'   <Date>1461194149330</Date>\n' +
	'   <Sensor x="75" y="30" />\n' +
	'   <Settings showSensor="false" showForce="false" showTracers="false" showFlowlines="false" />\n' +
	'   <Data xdim="150" ydim="60">\n' +
	'       <Attributes>0:3176,1:6,0:142,1:3,0:4,1:3,0:139,1:2,0:8,1:2,0:137,1:2,0:10,1:2,0:135,1:2,0:12,1:2,0:134,1,0:14,1,0:133,1:2,0:14,1:2,0:132,1,0:16,1,0:132,1,0:16,1,0:132,1,0:16,1,0:132,1,0:16,1,0:132,1:2,0:14,1:2,0:133,1,0:14,1,0:134,1:2,0:12,1:2,0:135,1:2,0:10,1:2,0:137,1:2,0:8,1:2,0:139,1:3,0:4,1:3,0:142,1:6,0:3268</Attributes>\N' +
	'   </Data>\n' +
    '</Save>\n'
    );

presets.push(
    '<?xml version="1.0" encoding="ISO-8859-1" standalone="yes" ?>\n' +
    '<Save>\n' +
	'   <Name>Experiment 5</Name>\n' +
	'   <Date>1461194149330</Date>\n' +
	'   <Sensor x="75" y="30" />\n' +
	'   <Settings showSensor="false" showForce="false" showTracers="false" showFlowlines="false" />\n' +
	'   <Data xdim="150" ydim="60">\n' +
	'       <Attributes>0:3176,1:6,0:142,1:3,0:4,1:3,0:139,1:2,0:8,1:2,0:137,1:2,0:10,1:2,0:135,1:2,0:12,1:2,0:134,1,0:14,1,0:133,1:2,0:14,1:2,0:132,1,0:16,1,0:132,1,0:16,1,0:132,1,0:16,1,0:132,1,0:16,1,0:132,1:2,0:14,1:2,0:133,1,0:14,1,0:134,1:2,0:12,1:2,0:135,1:2,0:10,1:2,0:137,1:2,0:8,1:2,0:139,1:3,0:4,1:3,0:142,1:6,0:3268</Attributes>\N' +
	'   </Data>\n' +
    '</Save>\n'
    );