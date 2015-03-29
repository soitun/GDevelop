/*
 * GDevelop JS Platform
 * Copyright 2008-2015 Florian Rival (Florian.Rival@gmail.com). All rights reserved.
 * This project is released under the MIT License.
 */
#include "CommonConversionsExtension.h"
#include "GDCore/BuiltinExtensions/AllBuiltinExtensions.h"
#include "GDCore/IDE/ArbitraryResourceWorker.h"
#include "GDCore/Events/EventsCodeGenerator.h"
#include "GDCore/CommonTools.h"
#include "GDCore/Tools/Localization.h"

namespace gdjs
{

CommonConversionsExtension::CommonConversionsExtension()
{
    gd::BuiltinExtensionsImplementer::ImplementsCommonConversionsExtension(*this);

    SetExtensionInformation("BuiltinCommonConversions",
                          GD_T("Standard Conversions"),
                          GD_T("Built-in extension providing standard conversions expressions."),
                          "Florian Rival",
                          "Open source (MIT License)");

    GetAllExpressions()["ToNumber"].codeExtraInformation
        .SetFunctionName("gdjs.evtTools.common.toNumber").SetIncludeFile("commontools.js");
    GetAllStrExpressions()["ToString"].codeExtraInformation
        .SetFunctionName("gdjs.evtTools.common.toString").SetIncludeFile("commontools.js");
    GetAllStrExpressions()["LargeNumberToString"].codeExtraInformation //TODO: Check if scientific notation is added or not by toString.
        .SetFunctionName("gdjs.evtTools.common.toString").SetIncludeFile("commontools.js");
    GetAllExpressions()["ToRad"].codeExtraInformation
        .SetFunctionName("gdjs.toRad");
    GetAllExpressions()["ToDeg"].codeExtraInformation
        .SetFunctionName("gdjs.toDegrees");
}

}
