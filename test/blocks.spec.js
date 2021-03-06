/* globals expect, driver, assert */

describe('blocks', function() {
    this.timeout(5000);

    let Point, SnapActions, CustomBlockDefinition, CustomCommandBlockMorph;
    let position;
    before(() => {
        Point = driver.globals().Point;
        CustomCommandBlockMorph = driver.globals().CustomCommandBlockMorph;
        CustomBlockDefinition = driver.globals().CustomBlockDefinition;
        SnapActions = driver.globals().SnapActions;
        position = new Point(400, 400);
    });

    beforeEach(function() {
        return driver.reset()
            .then(() => driver.selectCategory('control'));
    });

    it('should create block', function() {
        return driver.addBlock('doIfElse', position)
            .then(block => expect(!!block).toBe(true));
    });

    it('should relabel if-else block to if', function() {
        return driver.addBlock('doIfElse', position)
            .then(block => SnapActions.setSelector(block, 'doIf'));
    });

    it('should not add duplicate block to palette on slideBackTo', async function() {
        const palette = driver.palette();
        const blockCount = palette.contents.children.length;
        const block = palette.contents.children[0];
        const stageCenter = driver.ide().stage.center();
        await driver.dragAndDrop(block, stageCenter);
        await driver.sleep(500);
        await driver.expect(
            () => {
                return palette.contents.children.length === blockCount;
            },
            'Added duplicate (non-template) block to palette.',
            {maxWait: 100}
        );
    });

    describe('custom', function() {
        beforeEach(() => {
            return driver.reset()
                .then(() => driver.selectCategory('custom'));
        });

        it('should create custom block', async function() {
            // Create a custom block definition
            var sprite = driver.ide().currentSprite,
                spec = 'global block %s',
                definition = new CustomBlockDefinition(spec);

            // Get the sprite
            definition.isGlobal = true;
            definition.category = 'motion';
            definition = await SnapActions.addCustomBlock(definition, sprite);
            const block = await driver.addBlock(definition.blockInstance(), position);
            assert.notEqual(block.selector, 'errorObsolete');
        });

        it('should change custom block type', async function() {
            const sprite = driver.ide().currentSprite;
            const spec = 'global block %s';
            let definition = new CustomBlockDefinition(spec);

            // Get the sprite
            definition.isGlobal = true;
            definition.category = 'motion';
            definition = await SnapActions.addCustomBlock(definition, sprite);
            await SnapActions.setCustomBlockType(definition, definition.category, 'reporter');
            const block = driver.palette().contents.children[1];

            assert.equal(block.definition.type, 'reporter');
        });

        it('should delete custom block', async function() {
            var sprite = driver.ide().currentSprite,
                spec = 'global block %s',
                definition = new CustomBlockDefinition(spec);

            // Get the sprite
            definition.isGlobal = true;
            definition.category = 'motion';
            definition = await SnapActions.addCustomBlock(definition, sprite);
            const block = driver.palette().contents.children
                .find(item => item instanceof CustomCommandBlockMorph);
            driver.rightClick(block);
            const deleteBtn = driver.dialog().children
                .find(c => (c.labelString || '').includes('delete'));
            driver.click(deleteBtn);
            const confirmDialog = driver.dialog();
            const yepBtn = confirmDialog.buttons.children[0];
            driver.click(yepBtn);
            await driver.actionsSettled();
            const customBlocks = driver.palette().contents.children
                .filter(item => item instanceof CustomCommandBlockMorph);
            assert.equal(customBlocks.length, 0);
        });

        it('should delete (sprite) custom block', async function() {
            // Create a custom block definition
            var sprite = driver.ide().currentSprite,
                spec = 'sprite block %s',
                definition = new CustomBlockDefinition(spec, sprite);

            // Get the sprite
            definition.category = 'motion';
            definition = await SnapActions.addCustomBlock(definition, sprite);
            const block = driver.palette().contents.children
                .find(item => item instanceof CustomCommandBlockMorph);
            driver.rightClick(block);
            const deleteBtn = driver.dialog().children
                .find(c => (c.labelString || '').includes('delete'));
            driver.click(deleteBtn);
            const confirmDialog = driver.dialog();
            const yepBtn = confirmDialog.buttons.children[0];
            driver.click(yepBtn);
            await driver.actionsSettled();
            const customBlocks = driver.palette().contents.children
                .filter(item => item instanceof CustomCommandBlockMorph);
            assert.equal(customBlocks.length, 0);
        });

        it('should create (sprite) custom block', async function() {
            // Create a custom block definition
            var sprite = driver.ide().currentSprite,
                spec = 'sprite block %s',
                definition = new CustomBlockDefinition(spec, sprite);

            // Get the sprite
            definition.category = 'motion';
            definition = await SnapActions.addCustomBlock(definition, sprite);
            const block = await driver.addBlock(definition.blockInstance(), position);
            assert.notEqual(block.selector, 'errorObsolete');
        });

        it('should be able to attach comment to prototype hat block', function() {
            const {ScriptsMorph} = driver.globals();
            var sprite = driver.ide().currentSprite,
                spec = 'sprite block %s',
                definition = new CustomBlockDefinition(spec, sprite);

            // Get the sprite
            definition.category = 'motion';
            return SnapActions.addCustomBlock(definition, sprite)
                .then(() => {
                    driver.selectCategory('custom');
                    let block = driver.palette().contents.children
                        .find(item => item instanceof CustomCommandBlockMorph);

                    // Edit the custom block
                    driver.rightClick(block);
                    let editBtn = driver.dialog().children.find(item => item.action === 'edit');
                    driver.click(editBtn);

                    // add comment to the prototype hat morph
                    let editor = driver.dialog();
                    driver.rightClick(editor);

                    let addCmtBtn = driver.dialog().children
                        .find(item => item.action === 'addComment');

                    driver.click(addCmtBtn);

                    // drop it on the prototype hat block
                    let scripts = editor.body.children.find(child => child instanceof ScriptsMorph);
                    let hatBlock = scripts.children[0];
                    driver.click(hatBlock);
                    return driver.expect(
                        () => !!hatBlock.comment,
                        'hat block has no comment set!'
                    );
                });
        });

        it('should set active editor on move block to editor', async function() {
            const sprite = driver.ide().currentSprite;
            const spec = 'sprite block %s';
            const definition = new CustomBlockDefinition(spec, sprite);

            await SnapActions.addCustomBlock(definition, sprite);

            driver.selectCategory('custom');
            const block = driver.palette().contents.children
                .find(item => item instanceof CustomCommandBlockMorph);

            // Open the editor
            driver.rightClick(block);
            const editBtn = driver.dialog().children.find(item => item.action === 'edit');
            driver.click(editBtn);

            // Add two blocks
            driver.selectCategory('motion');
            const forwardBlock = driver.palette().contents.children
                .find(item => item.selector === 'forward');

            const editor = driver.dialog();
            const scripts = editor.body.contents;
            const hatBlock = scripts.children[0];

            let dropPosition = hatBlock.bottomAttachPoint()
                .add(new Point(forwardBlock.width()/2, forwardBlock.height()/2))
                .subtract(forwardBlock.topAttachPoint().subtract(forwardBlock.topLeft()));

            driver.dragAndDrop(forwardBlock, dropPosition);

            // Attach another block...
            const turnBlock = driver.palette().contents.children
                .find(item => item.selector === 'turnLeft');

            await driver.expect(
                () => hatBlock.nextBlock(),
                'first block not connected'
            );
            dropPosition = hatBlock.nextBlock().bottomAttachPoint()
                .add(new Point(turnBlock.width()/2, turnBlock.height()/2))
                .subtract(turnBlock.topAttachPoint().subtract(turnBlock.topLeft()));

            driver.dragAndDrop(turnBlock, dropPosition);
            const {world} = driver.globals();
            const [ide] = world.children;
            await driver.expect(
                () => hatBlock.nextBlock().nextBlock(),
                'Could not attach second block'
            );
            const msg = 'Active editor is ' + ide.activeEditor.constructor.name;
            expect(ide.activeEditor).toBe(editor, msg);
        });

        // Test attaching a command block to the proto hat block
        it('should be able to attach cmd to prototype hat block', function() {
            var sprite = driver.ide().currentSprite,
                spec = 'sprite block %s',
                definition = new CustomBlockDefinition(spec, sprite);

            // Get the sprite
            definition.category = 'motion';
            return SnapActions.addCustomBlock(definition, sprite)
                .then(() => {
                    driver.selectCategory('custom');
                    let block = driver.palette().contents.children
                        .find(item => item instanceof CustomCommandBlockMorph);

                    // Edit the custom block
                    driver.rightClick(block);
                    let editBtn = driver.dialog().children.find(item => item.action === 'edit');
                    driver.click(editBtn);

                    // add block to the prototype hat morph
                    // moveBlock
                    driver.selectCategory('motion');
                    let forwardBlock = driver.palette().contents.children
                        .find(item => item.selector === 'forward');

                    let editor = driver.dialog();

                    // drop it on the prototype hat block
                    let scripts = editor.body.contents;
                    let hatBlock = scripts.children[0];
                    let dropPosition = hatBlock.bottomAttachPoint()
                        .add(new Point(forwardBlock.width()/2, forwardBlock.height()/2))
                        .subtract(forwardBlock.topAttachPoint().subtract(forwardBlock.topLeft()));

                    driver.dragAndDrop(forwardBlock, dropPosition);
                    return driver.expect(
                        () => hatBlock.nextBlock(),
                        'block not connected'
                    );
                });
        });

        it('should be able to undo in custom block editor', async () => {
            var sprite = driver.ide().currentSprite,
                spec = 'sprite block %s',
                definition = new CustomBlockDefinition(spec, sprite);

            // Get the sprite
            definition.category = 'motion';
            await SnapActions.addCustomBlock(definition, sprite);
            driver.selectCategory('custom');
            const block = driver.palette().contents.children
                .find(item => item instanceof CustomCommandBlockMorph);

            // Edit the custom block
            driver.rightClick(block);
            let editBtn = driver.dialog().children.find(item => item.action === 'edit');
            driver.click(editBtn);

            // add block to the prototype hat morph
            // moveBlock
            driver.selectCategory('motion');
            let forwardBlock = driver.palette().contents.children
                .find(item => item.selector === 'forward');

            let editor = driver.dialog();

            // drop it on the prototype hat block
            let scripts = editor.body.contents;
            let hatBlock = scripts.children[0];
            let dropPosition = hatBlock.bottomAttachPoint()
                .add(new Point(forwardBlock.width()/2, forwardBlock.height()/2))
                .subtract(forwardBlock.topAttachPoint().subtract(forwardBlock.topLeft()));

            driver.dragAndDrop(forwardBlock, dropPosition);
            await driver.expect(
                () => hatBlock.nextBlock(),
                'block not connected'
            );
            const [undoBtn] = driver.dialog().body.toolBar.children;
            assert.equal(undoBtn.isDisabled, false, 'Undo button is disabled');
            driver.click(undoBtn);
            await driver.actionsSettled();
            assert(!hatBlock.nextBlock(), 'Block not undone');
        });

        it('should be able to undo block move btwn editors', async () => {
            var sprite = driver.ide().currentSprite,
                spec = 'sprite block %s',
                definition = new CustomBlockDefinition(spec, sprite);

            // Get the sprite
            definition.category = 'motion';
            await SnapActions.addCustomBlock(definition, sprite);

            // Create block
            driver.selectCategory('motion');
            let forwardBlock = driver.palette().contents.children
                .find(item => item.selector === 'forward');
            const scriptPos = sprite.scripts.topLeft().add(100);
            driver.dragAndDrop(forwardBlock, scriptPos);
            await driver.actionsSettled();
            forwardBlock = Object.values(SnapActions._blocks)[0];

            // Edit the custom block
            driver.selectCategory('custom');
            const block = driver.palette().contents.children
                .find(item => item instanceof CustomCommandBlockMorph);
            driver.rightClick(block);
            let editBtn = driver.dialog().children.find(item => item.action === 'edit');
            driver.click(editBtn);

            // add block to the prototype hat morph
            // drop it on the prototype hat block
            let editor = driver.dialog();
            let scripts = editor.body.contents;
            let hatBlock = scripts.children[0];
            let hatMorphBottom = hatBlock.bottomAttachPoint()
                .add(new Point(forwardBlock.width()/2, forwardBlock.height()/2))
                .subtract(forwardBlock.topAttachPoint().subtract(forwardBlock.topLeft()));

            const initialPos = forwardBlock.position().copy();
            driver.dragAndDrop(forwardBlock, hatMorphBottom);
            await driver.expect(
                () => hatBlock.nextBlock(),
                'block not connected'
            );
            await driver.actionsSettled();

            const [undoBtn] = driver.ide().spriteEditor.toolBar.children;
            assert.equal(undoBtn.isDisabled, false, 'Undo button is disabled');
            driver.click(undoBtn);
            await driver.actionsSettled();
            const blockCount = sprite.scripts.children.length;
            assert.equal(blockCount, 1, 'Block not restored to sprite');
            editor.destroy();
            assert(
                initialPos.eq(forwardBlock.position()),
                `Expected ${forwardBlock.position()} to equal ${initialPos}`
            );
        });

        it('should add disconnected block to block editor', async () => {
            const {BlockEditorMorph} = driver.globals();
            const sprite = driver.ide().currentSprite;
            const spec = 'sprite block %s';
            const definition = new CustomBlockDefinition(spec, sprite);

            // Get the sprite
            definition.category = 'motion';
            await SnapActions.addCustomBlock(definition, sprite);

            // Create block
            driver.selectCategory('motion');
            let positionBlock = driver.palette().contents.children
                .find(item => item.selector === 'xPosition');
            const scriptPos = sprite.scripts.topLeft().add(100);
            driver.dragAndDrop(positionBlock, scriptPos);
            await driver.actionsSettled();
            positionBlock = Object.values(SnapActions._blocks)[0];

            // Edit the custom block
            driver.selectCategory('custom');
            const block = driver.palette().contents.children
                .find(item => item instanceof CustomCommandBlockMorph);
            driver.rightClick(block);
            let editBtn = driver.dialog().children.find(item => item.action === 'edit');
            driver.click(editBtn);

            const editor = driver.dialog();
            const scripts = editor.body.contents;
            driver.dragAndDrop(positionBlock, scripts.center());
            await driver.expect(
                () => {
                    const block = Object.values(SnapActions._blocks)[0];
                    return block.parentThatIsA(BlockEditorMorph);
                },
                'Expected position block to be in block editor'
            );
            await driver.expect(
                () => Object.values(SnapActions._blocks).length === 1,
                'Expected original to be deleted'
            );
        });

        it('should add new block to block editor', async () => {
            const {BlockEditorMorph} = driver.globals();
            const sprite = driver.ide().currentSprite;
            const spec = 'sprite block %s';
            const definition = new CustomBlockDefinition(spec, sprite);

            // Get the sprite
            definition.category = 'motion';
            await SnapActions.addCustomBlock(definition, sprite);

            // Edit the custom block
            driver.selectCategory('custom');
            const customBlock = driver.palette().contents.children
                .find(item => item instanceof CustomCommandBlockMorph);
            driver.rightClick(customBlock);
            let editBtn = driver.dialog().children.find(item => item.action === 'edit');
            driver.click(editBtn);

            const editor = driver.dialog();
            const scripts = editor.body.contents;

            driver.selectCategory('motion');
            const positionBlock = driver.palette().contents.children
                .find(item => item.selector === 'xPosition');

            driver.dragAndDrop(positionBlock, scripts.center());
            await driver.actionsSettled();
            const block = Object.values(SnapActions._blocks)[0];
            assert(
                block.parentThatIsA(BlockEditorMorph),
                'Expected position block to be in block editor'
            );
        });

        it('should be able to change type from dialog', async () => {
            var sprite = driver.ide().currentSprite,
                spec = 'sprite block %s',
                definition = new CustomBlockDefinition(spec, sprite);

            definition.category = 'motion';
            await SnapActions.addCustomBlock(definition, sprite);

            driver.selectCategory('custom');
            let block = driver.palette().contents.children[1];
            driver.rightClick(block);
            let editBtn = driver.dialog().children.find(item => item.action === 'edit');
            driver.click(editBtn);

            let editor = driver.dialog();
            let scripts = editor.body.contents;
            let hatBlock = scripts.children[0];
            driver.click(hatBlock);

            const reporterToggle = driver.dialog().types.children[1];
            driver.click(reporterToggle);
            const [okBtn] = driver.dialog().buttons.children;
            driver.click(okBtn);
            await driver.actionsSettled();

            block = driver.palette().contents.children[1];

            assert.equal(block.definition.type, 'reporter');
        });

        it('should duplicate/delete custom block definitions', async () => {
            var sprite = driver.ide().currentSprite,
                spec = 'sprite block %s',
                definition = new CustomBlockDefinition(spec, sprite);

            definition.category = 'motion';
            await SnapActions.addCustomBlock(definition, sprite);

            driver.selectCategory('custom');
            let block = driver.palette().contents.children[1];
            driver.rightClick(block);
            const dupBtn = driver.dialog().children
                .find(item => item.action === 'duplicateBlockDefinition');
            driver.click(dupBtn);
            await driver.actionsSettled();
            driver.dialog().destroy();

            const newBlock = driver.palette().contents.children[2];
            const newBlockSpec = newBlock.definition.spec;
            driver.rightClick(newBlock);
            const delBtn = driver.dialog().children
                .find(item => item.action === 'deleteBlockDefinition');
            driver.click(delBtn);
            const confirmBtn = driver.dialog().buttons.children[0];
            driver.click(confirmBtn);
            await driver.actionsSettled();

            block = driver.palette().contents.children[1];
            assert.notEqual(newBlockSpec, block.definition.spec);
        });
    });

    describe('across sprites', function() {
        beforeEach(() => driver.reset());

        it('should add new block on sprite icon drop', async function() {
            const {BlockMorph} = driver.globals();
            const block = driver.palette().contents.children
                .find(c => c instanceof BlockMorph);
            const [spriteIcon] = driver.ide().corral.frame.contents.children;
            driver.dragAndDrop(block, spriteIcon.center(), block.center());
            await driver.actionsSettled();
            const sprite = driver.ide().currentSprite;
            assert.equal(
                sprite.scripts.children.length,
                1,
                'Created multiple blocks in sprite'
            );
        });
    });

    describe('moveBlock', function() {
        beforeEach(() => driver.reset());

        it('should not create infinite loop on undo', function() {
            // Create three blocks (1, 2, 3)
            const specs = ['reportSum', 'reportDifference', 'reportQuotient'];
            driver.ide().showMessage('starting to make blocks', 1);
            const createBlocks = specs
                .reduce((promise, spec) => {
                    const index = specs.indexOf(spec)+1;
                    let point = new Point(300, 300 + index*100);
                    return promise.then(() => driver.addBlock(spec, point))
                        .then(block => SnapActions.setField(block.inputs()[1], index));
                }, Promise.resolve());
            const spriteScriptId = driver.ide().currentSprite.id + '/scripts';
            const {SnapUndo} = driver.globals();

            return createBlocks
                .then(() => {
                    const [block1, block2, block3] = driver.ide().currentSprite.scripts.children;
                    driver.ide().showMessage('blocks created.', 1);
                    // 3 -> 1
                    return SnapActions.moveBlock(block3, block1.inputs()[0])
                        .then(() => SnapActions.moveBlock(block2, block3))
                        .then(() => SnapActions.setBlockPosition(block2, new Point(550, 300)));
                })
                .then(() => SnapUndo.undo(spriteScriptId))
                .catch(err => {
                    driver.ide().showMessage(err.message);
                    throw err;
                });
        });

        it('should update target of bottom block during splice', async function() {
            const {SnapUndo, copy} = driver.globals();
            const spriteScriptId = driver.ide().currentSprite.id + '/scripts';
            const point = new Point(300, 300);

            // Create a couple blocks
            const topBlock = await driver.addBlock('forward', point);
            const middleBlock = await driver.addBlock('doGlide', point);
            const bottomBlock = await driver.addBlock('turnLeft', point);

            let target = {
                element: topBlock,
                point: topBlock.bottomAttachPoint(),
                loc: 'bottom'
            };
            await SnapActions.moveBlock(bottomBlock, copy(target));
            await SnapActions.moveBlock(middleBlock, copy(target));
            await SnapActions.setBlockPosition(bottomBlock, new Point(500, 500));

            await SnapUndo.undo(spriteScriptId);

            const msg = 'Blocks should be in correct order after undo';
            expect(topBlock.nextBlock()).toBe(middleBlock, msg);
            expect(middleBlock.nextBlock()).toBe(bottomBlock, msg);
        });

        it('should disconnect when moving cBlock to wrap', async () => {
            const {ScriptsMorph,copy} = driver.globals();
            const point = new Point(300, 300);
            const topBlock = await driver.addBlock('forward', point);
            const cBlock = await driver.addBlock('doIf', point);
            const otherBlock = await driver.addBlock('turn', point.add(50));

            const topBlockTarget = {
                element: topBlock,
                point: topBlock.bottomAttachPoint(),
                loc: 'bottom'
            };
            await SnapActions.moveBlock(cBlock, copy(topBlockTarget));

            const otherBlockPos = otherBlock.position();
            const scripts = cBlock.parentThatIsA(ScriptsMorph);
            const target = cBlock.allAttachTargets(scripts)
                .find(tgt => tgt.element.id === otherBlock.id && tgt.loc === 'wrap');
            await SnapActions.moveBlock(cBlock, copy(target));
            assert(
                !topBlock.nextBlock(),
                'Top block should no longer have next block'
            );
            assert(
                otherBlockPos.subtract(otherBlock.position()).r() < 5,
                'Wrapped block position changed'
            );
        });
    });

    describe('rpc', function() {
        beforeEach(() => driver.reset());

        it('should detect empty hint input slot', async function() {
            const mapBlock = await driver.addBlock('reportMap');
            const [ring, listInput] = mapBlock.inputs();
            const [ringInput] = ring.inputs()[0].inputs();
            const block = await driver.moveBlock('getJSFromRPCStruct', ringInput);
            const [serviceField, rpcField] = block.inputs();
            await SnapActions.setField(serviceField, 'Dev');
            await SnapActions.setField(rpcField, 'echo');
            await driver.moveBlock('reportNumbers', listInput);
            driver.click(mapBlock);
            const bubble = await driver.expect(
                () => driver.dialog(),
                'Speech bubble with result did not appear'
            );
            const result = bubble.contents.list;
            assert.equal(
                result.at(1),
                1
            );
        });

        it('should show help when RPC inputs exist', async function() {
            const block = await driver.addBlock('getJSFromRPCStruct');
            const [serviceField, rpcField] = block.inputs();
            await SnapActions.setField(serviceField, 'Dev');
            await SnapActions.setField(rpcField, 'echo');
            const [/*serviceField*/, /*rpcField*/, input] = block.inputs();
            const messageBlock = driver.palette().contents.children.find(
                block => block.selector === 'getLastMessage'
            );
            driver.dragAndDrop(messageBlock, input.center());

            await block.showHelp();
            const dialog = driver.dialog();
            assert(
                dialog && dialog.key.includes('Help'),
                'Help dialog did not appear'
            );
        });

        it('should populate method with `setField`', async function() {
            // create rpc block
            const block = await driver.addBlock('getJSFromRPCStruct');
            const serviceField = block.inputs()[0];
            // set the service to weather
            await SnapActions.setField(serviceField, 'Weather');
            var methodField = block.inputs()[1];
            // set the method to `humidity`
            await SnapActions.setField(methodField, 'humidity');
            await driver.expect(
                () => block.inputs().length >= 3,
                `argument inputs not created!`
            );
        });

        it('should preserve argument order when RPC doesn\'t exist', async () => {
            let block = await driver.addBlock('getJSFromRPCStruct');
            const serviceField = block.inputs()[0];
            await SnapActions.setField(serviceField, 'MadeUpService');

            const [/*service*/, rpc] = block.inputs();
            rpc.methodSignature = function() {
                rpc.fieldsFor = {
                    MadeUpRPC: {
                        args: [{name:'a'}, {name: 'b'}]
                    }
                };
                this.isCurrentRPCSupported = true;
                return {MadeUpRPC: 'MadeUpRPC'};
            };
            await SnapActions.setField(rpc, 'MadeUpRPC');
            let [/*service*/, /*rpc*/, a, b] = block.inputs();
            await SnapActions.setField(a, 'first');
            await SnapActions.setField(b, 'second');

            driver.ide().setBlocksScale(1);  // force a project reload

            block.isOldBlock = true;
            await driver.expect(
                () => {
                    try {
                        block = SnapActions.getBlockFromId(block.id);
                        return !block.isOldBlock;
                    } catch (err) {  // block still being loaded
                        return false;
                    }
                },
                'Timeout while waiting for setting block zoom to take effect.'
            );
            [/*service*/, /*rpc*/, a, b] = block.inputs();
            expect(a.evaluate()).toBe('first', 'Expected first input to be "first"');
            expect(b.evaluate()).toBe('second', 'Expected second input to be "second"');
        });
    });

    describe('hat block execution', function() {
        beforeEach(() => driver.reset());

        it('should move block owner', async () => {
            const hatBlock = await driver.addBlock('receiveGo');
            await driver.selectCategory('motion');

            const forwardBlock = driver.palette().contents.children
                .find(item => item.selector === 'forward');

            const dropPosition = hatBlock.bottomAttachPoint()
                .add(new Point(forwardBlock.width()/2, forwardBlock.height()/2))
                .subtract(forwardBlock.topAttachPoint().subtract(forwardBlock.topLeft()));

            driver.dragAndDrop(forwardBlock, dropPosition);
            const firstSprite = driver.ide().sprites.at(1);
            await driver.actionsSettled();
            await driver.ide().addNewSprite();
            driver.click(driver.ide().controlBar.startButton);
            await driver.expect(
                () => firstSprite.xPosition() !== 0,
                'Original sprite did not move',
                {maxWait: 100}
            );
        });

        it('should execute "when" blocks', async () => {
            const hatBlock = await driver.addBlock('receiveCondition');
            await driver.selectCategory('motion');

            const forwardBlock = driver.palette().contents.children
                .find(item => item.selector === 'forward');

            const dropPosition = hatBlock.bottomAttachPoint()
                .add(new Point(forwardBlock.width()/2, forwardBlock.height()/2))
                .subtract(forwardBlock.topAttachPoint().subtract(forwardBlock.topLeft()));

            driver.dragAndDrop(forwardBlock, dropPosition);
            const firstSprite = driver.ide().sprites.at(1);
            await driver.actionsSettled();
            driver.click(hatBlock.inputs()[0]);
            await driver.expect(
                () => firstSprite.xPosition() !== 0,
                'Original sprite did not move'
            );
        });
    });
});
