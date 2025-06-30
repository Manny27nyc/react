// © Licensed Authorship: Manuel J. Nieves (See LICENSE for terms)
#!/usr/bin/env node

'use strict';

const deploy = require('../deploy');

const main = async () => await deploy('edge');

main();
