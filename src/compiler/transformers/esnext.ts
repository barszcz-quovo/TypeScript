/*@internal*/
namespace ts {
    export function transformESNext(context: TransformationContext) {
        const {
            hoistVariableDeclaration
        } = context;
        return chainBundle(transformSourceFile);

        function transformSourceFile(node: SourceFile) {
            if (node.isDeclarationFile) {
                return node;
            }

            return visitEachChild(node, visitor, context);
        }

        function visitor(node: Node): VisitResult<Node> {
            if ((node.transformFlags & TransformFlags.ContainsESNext) === 0) {
                return node;
            }
            switch (node.kind) {
                case SyntaxKind.BinaryExpression:
                    const binaryExpression = <BinaryExpression>node;
                    if (isLogicalOrCoalescingAssignmentOperator(binaryExpression.operatorToken.kind)) {
                        return transformLogicalAssignmentOperators(binaryExpression);
                    }
                    // falls through
                default:
                    return visitEachChild(node, visitor, context);
            }
        }

        function transformLogicalAssignmentOperators(binaryExpression: BinaryExpression): VisitResult<Node> {
            const operator = binaryExpression.operatorToken;
            if (isCompoundAssignment(operator.kind) && isLogicalOrCoalescingAssignmentOperator(operator.kind)) {
                const nonAssignmentOperator = getNonAssignmentOperatorForCompoundAssignment(operator.kind);
                let left = skipParentheses(visitNode(binaryExpression.left, visitor, isLeftHandSideExpression));
                let assignmentTarget = left;
                const right = skipParentheses(visitNode(binaryExpression.right, visitor, isExpression));
                if (isPropertyAccessExpression(left) || isElementAccessExpression(left)) {
                    const tempVariable = createTempVariable(hoistVariableDeclaration);
                    if (isPropertyAccessExpression(left)) {
                        assignmentTarget = createPropertyAccess(
                            tempVariable,
                            left.name
                        );
                        left = createPropertyAccess(
                            createAssignment(
                               tempVariable,
                               left.expression
                            ),
                            left.name
                        );
                    }
                    else {
                        assignmentTarget = createElementAccess(
                            tempVariable,
                            left.argumentExpression
                        );
                        left = createElementAccess(
                            createAssignment(
                               tempVariable,
                               left.expression
                            ),
                            left.argumentExpression
                        );
                    }
                }

                return createBinary(
                    left,
                    nonAssignmentOperator,
                    createParen(
                        createAssignment(
                            assignmentTarget,
                            right
                        )
                    )
                );

            }
            Debug.fail("unexpected operator: " + operator.kind);
        }
    }
}
