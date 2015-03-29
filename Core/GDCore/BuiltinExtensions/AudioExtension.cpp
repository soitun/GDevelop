/*
 * GDevelop Core
 * Copyright 2008-2015 Florian Rival (Florian.Rival@gmail.com). All rights reserved.
 * This project is released under the MIT License.
 */
#include "AllBuiltinExtensions.h"
#include "GDCore/Tools/Localization.h"

using namespace std;
namespace gd
{

void GD_CORE_API BuiltinExtensionsImplementer::ImplementsAudioExtension(gd::PlatformExtension & extension)
{
    extension.SetExtensionInformation("BuiltinAudio",
                          GD_T("Audio"),
                          GD_T("Builtin audio extension"),
                          "Florian Rival",
                          "Open source (MIT License)");

    #if defined(GD_IDE_ONLY)
    extension.AddAction("PlaySoundCanal",
                   GD_T("Play a sound on a channel"),
                   GD_T("Play a sound ( small audio file ) on a specific channel,\nso as to be able to manipulate it."),
                   GD_T("Play the sound _PARAM1_ on the channel _PARAM2_"),
                   GD_T("Audio/Sounds on channels"),
                   "res/actions/son24.png",
                   "res/actions/son.png")
        .AddCodeOnlyParameter("currentScene", "")
        .AddParameter("soundfile", GD_T("Audio file"), "",false)
        .AddParameter("expression", GD_T("Canal ( 0 - 15 )"), "",false)
        .AddParameter("yesorno", GD_T("Repeat the sound \?"), "",true).SetDefaultValue("no")
        .AddParameter("expression", GD_T("Volume ( From 0 to 100, 100 by default )"), "",true).SetDefaultValue("100")
        .AddParameter("expression", GD_T("Pitch ( speed ) ( 1 by default )"), "",true).SetDefaultValue("1")
        .MarkAsAdvanced();

    extension.AddAction("StopSoundCanal",
                   GD_T("Stop the sound of a channel"),
                   GD_T("Stop the sound on the specified channel."),
                   GD_T("Stop the sound of channel _PARAM1_"),
                   GD_T("Audio/Sounds on channels"),
                   "res/actions/son24.png",
                   "res/actions/son.png")
        .AddCodeOnlyParameter("currentScene", "")
        .AddParameter("expression", GD_T("Canal ( 0 - 15 )"), "",false)
        .MarkAsAdvanced();

    extension.AddAction("PauseSoundCanal",
                   GD_T("Pause the sound of a channel"),
                   GD_T("Pause the sound played on the specified channel."),
                   GD_T("Pause the sound of channel _PARAM1_"),
                   GD_T("Audio/Sounds on channels"),
                   "res/actions/son24.png",
                   "res/actions/son.png")
        .AddCodeOnlyParameter("currentScene", "")
        .AddParameter("expression", GD_T("Canal ( 0 - 15 )"), "",false)
        .MarkAsAdvanced();

    extension.AddAction("RePlaySoundCanal",
                   GD_T("Play the sound of a channel"),
                   GD_T("Play the sound of the channel."),
                   GD_T("Play the sound of channel _PARAM1_"),
                   GD_T("Audio/Sounds on channels"),
                   "res/actions/son24.png",
                   "res/actions/son.png")
        .AddCodeOnlyParameter("currentScene", "")
        .AddParameter("expression", GD_T("Canal ( 0 - 15 )"), "",false)
        .MarkAsAdvanced();

    extension.AddAction("PlayMusicCanal",
                   GD_T("Play a music on a channel"),
                   GD_T("Play a music an on specific channel,\nso as to be able to interact with later."),
                   GD_T("Play the music _PARAM1_ on channel _PARAM2_"),
                   GD_T("Audio/Musics on channels"),
                   "res/actions/music24.png",
                   "res/actions/music.png")
        .AddCodeOnlyParameter("currentScene", "")
        .AddParameter("musicfile", GD_T("Audio file"), "",false)
        .AddParameter("expression", GD_T("Canal ( 0 - 15 )"), "",false)
        .AddParameter("yesorno", GD_T("Repeat the sound \?"), "",true).SetDefaultValue("no")
        .AddParameter("expression", GD_T("Volume ( From 0 to 100, 100 by default )"), "",true).SetDefaultValue("100")
        .AddParameter("expression", GD_T("Pitch ( speed ) ( 1 by default )"), "",true).SetDefaultValue("1")
        .MarkAsAdvanced();

    extension.AddAction("StopMusicCanal",
                   GD_T("Stop the music on a channel"),
                   GD_T("Stop the music on the specified channel"),
                   GD_T("Stop the music of channel _PARAM1_"),
                   GD_T("Audio/Musics on channels"),
                   "res/actions/music24.png",
                   "res/actions/music.png")
        .AddCodeOnlyParameter("currentScene", "")
        .AddParameter("expression", GD_T("Canal ( 0 - 15 )"), "",false)
        .MarkAsAdvanced();

    extension.AddAction("PauseMusicCanal",
                   GD_T("Pause the music of a channel"),
                   GD_T("Pause the music on the specified channel."),
                   GD_T("Pause the music of channel _PARAM1_"),
                   GD_T("Audio/Musics on channels"),
                   "res/actions/music24.png",
                   "res/actions/music.png")
        .AddCodeOnlyParameter("currentScene", "")
        .AddParameter("expression", GD_T("Canal ( 0 - 15 )"), "",false)
        .MarkAsAdvanced();

    extension.AddAction("RePlayMusicCanal",
                   GD_T("Play the music of a channel"),
                   GD_T("Play the music of the channel."),
                   GD_T("Play the music of channel _PARAM1_"),
                   GD_T("Audio/Musics on channels"),
                   "res/actions/music24.png",
                   "res/actions/music.png")
        .AddCodeOnlyParameter("currentScene", "")
        .AddParameter("expression", GD_T("Canal ( 0 - 15 )"), "",false)
        .MarkAsAdvanced();

    extension.AddAction("ModVolumeSoundCanal",
                   GD_T("Volume of the sound on a channel"),
                   GD_T("This action modify the volume of the sound on the specified channel. The volume is between 0 and 100."),
                   GD_T("Do _PARAM2__PARAM3_ to the volume of the sound on channel _PARAM1_"),
                   GD_T("Audio/Sounds on channels"),
                   "res/actions/sonVolume24.png",
                   "res/actions/sonVolume.png")
        .AddCodeOnlyParameter("currentScene", "")
        .AddParameter("expression", GD_T("Canal ( 0 - 15 )"), "",false)
        .AddParameter("operator", GD_T("Modification's sign"), "",false)
        .AddParameter("expression", GD_T("Value"), "",false)
        .MarkAsAdvanced()
        .SetManipulatedType("number");

    extension.AddAction("ModVolumeMusicCanal",
                   GD_T("Volume of the music on a channel"),
                   GD_T("This action modify the volume of the music on the specified channel. The volume is between 0 and 100."),
                   GD_T("Do _PARAM2__PARAM3_ to the volume of the music on channel _PARAM1_"),
                   GD_T("Audio/Musics on channels"),
                   "res/actions/musicVolume24.png",
                   "res/actions/musicVolume.png")
        .AddCodeOnlyParameter("currentScene", "")
        .AddParameter("expression", GD_T("Canal ( 0 - 15 )"), "",false)
        .AddParameter("operator", GD_T("Modification's sign"), "",false)
        .AddParameter("expression", GD_T("Value"), "",false)
        .MarkAsAdvanced()
        .SetManipulatedType("number");

    extension.AddAction("ModGlobalVolume",
                   GD_T("Game global volume"),
                   GD_T("This action modify the global volume of the game. The volume is between 0 and 100."),
                   GD_T("Do _PARAM1__PARAM2_ to global sound level"),
                   GD_T("Audio"),
                   "res/actions/volume24.png",
                   "res/actions/volume.png")
        .AddCodeOnlyParameter("currentScene", "")
        .AddParameter("operator", GD_T("Modification's sign"), "",false)
        .AddParameter("expression", GD_T("Value"), "",false)
        .MarkAsSimple()
        .SetManipulatedType("number");

    extension.AddAction("ModPitchSoundChannel",
                   GD_T("Pitch of the sound of a channel"),
                   GD_T("This action modify pitch ( speed ) of the sound on a channel.\n1 is the default pitch."),
                   GD_T("Do _PARAM2__PARAM3_ to the pitch of the sound on channel _PARAM1_"),
                   GD_T("Audio/Sounds on channels"),
                   "res/actions/son24.png",
                   "res/actions/son.png")
        .AddCodeOnlyParameter("currentScene", "")
        .AddParameter("expression", GD_T("Canal ( 0 - 15 )"), "",false)
        .AddParameter("operator", GD_T("Modification's sign"), "",false)
        .AddParameter("expression", GD_T("Value"), "",false)
        .MarkAsAdvanced()
        .SetManipulatedType("number");

    extension.AddAction("ModPitchMusicChannel",
                   GD_T("Pitch of the music on a channel"),
                   GD_T("This action modify the pitch of the music on the specified channel. 1 is the default pitch"),
                   GD_T("Do _PARAM2__PARAM3_ to the pitch of the music on channel _PARAM1_"),
                   GD_T("Audio/Musics on channels"),
                   "res/actions/music24.png",
                   "res/actions/music.png")
        .AddCodeOnlyParameter("currentScene", "")
        .AddParameter("expression", GD_T("Canal ( 0 - 15 )"), "",false)
        .AddParameter("operator", GD_T("Modification's sign"), "",false)
        .AddParameter("expression", GD_T("Value"), "",false)
        .MarkAsAdvanced()
        .SetManipulatedType("number");

    extension.AddAction("ModPlayingOffsetSoundChannel",
                   GD_T("Playing offset of the sound on a channel"),
                   GD_T("This action modify the playing offset of the sound on a channel"),
                   GD_T("Do _PARAM2__PARAM3_ to the playing offset of the sound on channel _PARAM1_"),
                   GD_T("Audio/Sounds on channels"),
                   "res/actions/son24.png",
                   "res/actions/son.png")
        .AddCodeOnlyParameter("currentScene", "")
        .AddParameter("expression", GD_T("Canal ( 0 - 15 )"), "",false)
        .AddParameter("operator", GD_T("Modification's sign"), "",false)
        .AddParameter("expression", GD_T("Value"), "",false)
        .MarkAsAdvanced()
        .SetManipulatedType("number");

    extension.AddAction("ModPlayingOffsetMusicChannel",
                   GD_T("Playing offset of the music on a channel"),
                   GD_T("This action modify the playing offset of the music on the specified channel"),
                   GD_T("Do _PARAM2__PARAM3_ to the playing offset of the music on channel _PARAM1_"),
                   GD_T("Audio/Musics on channels"),
                   "res/actions/music24.png",
                   "res/actions/music.png")
        .AddCodeOnlyParameter("currentScene", "")
        .AddParameter("expression", GD_T("Canal ( 0 - 15 )"), "",false)
        .AddParameter("operator", GD_T("Modification's sign"), "",false)
        .AddParameter("expression", GD_T("Value"), "",false)
        .MarkAsAdvanced()
        .SetManipulatedType("number");

    extension.AddAction("PlaySound",
                   GD_T("Play a sound"),
                   GD_T("Play a sound."),
                   GD_T("Play the sound _PARAM1_"),
                   GD_T("Audio"),
                   "res/actions/son24.png",
                   "res/actions/son.png")
        .AddCodeOnlyParameter("currentScene", "")
        .AddParameter("soundfile", GD_T("Audio file"), "",false)
        .AddParameter("yesorno", GD_T("Repeat the sound \?"), "",true).SetDefaultValue("no")
        .AddParameter("expression", GD_T("Volume ( From 0 to 100, 100 by default )"), "",true).SetDefaultValue("100")
        .AddParameter("expression", GD_T("Pitch ( speed ) ( 1 by default )"), "",true).SetDefaultValue("1")
        .MarkAsSimple();

    extension.AddAction("PlayMusic",
                   GD_T("Play a music"),
                   GD_T("Play a music."),
                   GD_T("Play the music _PARAM1_"),
                   GD_T("Audio"),
                   "res/actions/music24.png",
                   "res/actions/music.png")
        .AddCodeOnlyParameter("currentScene", "")
        .AddParameter("musicfile", GD_T("Audio file"), "",false)
        .AddParameter("yesorno", GD_T("Repeat the sound \?"), "",true).SetDefaultValue("no")
        .AddParameter("expression", GD_T("Volume ( From 0 to 100, 100 by default )"), "",true).SetDefaultValue("100")
        .AddParameter("expression", GD_T("Pitch ( speed ) ( 1 by default )"), "",true).SetDefaultValue("1")
        .MarkAsSimple();

    extension.AddCondition("MusicPlaying",
                   GD_T("A music is being played"),
                   GD_T("Test if the music on a channel is being played"),
                   GD_T("Music on channel _PARAM1_ is being played"),
                   GD_T("Audio/Musics on channels"),
                   "res/conditions/musicplaying24.png",
                   "res/conditions/musicplaying.png")
        .AddCodeOnlyParameter("currentScene", "")
        .AddParameter("expression", GD_T("Channel"), "",false)
        .MarkAsAdvanced();

    extension.AddCondition("MusicPaused",
                   GD_T("A music is paused"),
                   GD_T("Test if the music on the specified channel is paused."),
                   GD_T("Music on channel _PARAM1_ is paused"),
                   GD_T("Audio/Musics on channels"),
                   "res/conditions/musicpaused24.png",
                   "res/conditions/musicpaused.png")
        .AddCodeOnlyParameter("currentScene", "")
        .AddParameter("expression", GD_T("Channel"), "",false)
        .MarkAsAdvanced();

    extension.AddCondition("MusicStopped",
                   GD_T("A music is stopped"),
                   GD_T("Test if the music on the specified channel is stopped."),
                   GD_T("Music on channel _PARAM1_ is stopped"),
                   GD_T("Audio/Musics on channels"),
                   "res/conditions/musicstopped24.png",
                   "res/conditions/musicstopped.png")
        .AddCodeOnlyParameter("currentScene", "")
        .AddParameter("expression", GD_T("Channel"), "",false)
        .MarkAsAdvanced();

    extension.AddCondition("SoundPlaying",
                   GD_T("A sound is being played"),
                   GD_T("Test if the sound on a channel is being played."),
                   GD_T("Sound on channel _PARAM1_ is being played"),
                   GD_T("Audio/Sounds on channels"),
                   "res/conditions/sonplaying24.png",
                   "res/conditions/sonplaying.png")
        .AddCodeOnlyParameter("currentScene", "")
        .AddParameter("expression", GD_T("Channel"), "",false)
        .MarkAsAdvanced();

    extension.AddCondition("SoundPaused",
                   GD_T("A sound is paused"),
                   GD_T("Test if the sound on the specified channel is paused."),
                   GD_T("Sound on channel _PARAM1_ is paused"),
                   GD_T("Audio/Sounds on channels"),
                   "res/conditions/sonpaused24.png",
                   "res/conditions/sonpaused.png")
        .AddCodeOnlyParameter("currentScene", "")
        .AddParameter("expression", GD_T("Channel"), "",false)
        .MarkAsAdvanced();

    extension.AddCondition("SoundStopped",
                   GD_T("A sound is stopped"),
                   GD_T("Test if the sound on the specified channel is stopped."),
                   GD_T("Sound on channel _PARAM1_ is stopped"),
                   GD_T("Audio/Sounds on channels"),
                   "res/conditions/sonstopped24.png",
                   "res/conditions/sonstopped.png")
        .AddCodeOnlyParameter("currentScene", "")
        .AddParameter("expression", GD_T("Channel"), "",false)
        .MarkAsAdvanced();

    extension.AddCondition("SoundCanalVolume",
                   GD_T("Volume of the sound on a channel"),
                   GD_T("Test the volume of the sound on the specified channel. The volume is between 0 and 100."),
                   GD_T("The volume of the sound on channel _PARAM1_ is _PARAM2__PARAM3_"),
                   GD_T("Audio/Sounds on channels"),
                   "res/conditions/sonVolume24.png",
                   "res/conditions/sonVolume.png")
        .AddCodeOnlyParameter("currentScene", "")
        .AddParameter("expression", GD_T("Canal ( 0 - 15 )"), "",false)
        .AddParameter("relationalOperator", GD_T("Sign of the test"), "",false)
        .AddParameter("expression", GD_T("Volume to test"), "",false)
        .MarkAsAdvanced()
        .SetManipulatedType("number");

    extension.AddCondition("MusicCanalVolume",
                   GD_T("Volume of the music on a channel"),
                   GD_T("Test the volume of the music on specified channel. The volume is between 0 and 100."),
                   GD_T("The volume of the music on channel _PARAM1_ is _PARAM2__PARAM3_"),
                   GD_T("Audio/Musics on channels"),
                   "res/conditions/musicVolume24.png",
                   "res/conditions/musicVolume.png")
        .AddCodeOnlyParameter("currentScene", "")
        .AddParameter("expression", GD_T("Canal ( 0 - 15 )"), "",false)
        .AddParameter("relationalOperator", GD_T("Sign of the test"), "",false)
        .AddParameter("expression", GD_T("Volume to test"), "",false)
        .MarkAsAdvanced()
        .SetManipulatedType("number");

    extension.AddCondition("GlobalVolume",
                   GD_T("Global volume"),
                   GD_T("Test the global sound level. The volume is between 0 and 100."),
                   GD_T("The global game volume is _PARAM2_ to _PARAM1_"),
                   GD_T("Audio"),
                   "res/conditions/volume24.png",
                   "res/conditions/volume.png")
        .AddCodeOnlyParameter("currentScene", "")
        .AddParameter("relationalOperator", GD_T("Sign of the test"), "",false)
        .AddParameter("expression", GD_T("Volume to test"), "",false)
        .SetManipulatedType("number");

    extension.AddCondition("SoundChannelPitch",
                   GD_T("Pitch of the sound of a channel"),
                   GD_T("Test the pitch of the sound on the specified channel. 1 is the default pitch."),
                   GD_T("The pitch of the sound on channel _PARAM1_ is _PARAM2__PARAM3_"),
                   GD_T("Audio/Sounds on channels"),
                   "res/conditions/sonVolume24.png",
                   "res/conditions/sonVolume.png")
        .AddCodeOnlyParameter("currentScene", "")
        .AddParameter("expression", GD_T("Canal ( 0 - 15 )"), "",false)
        .AddParameter("relationalOperator", GD_T("Sign of the test"), "",false)
        .AddParameter("expression", GD_T("Pitch to test"), "",false)
        .MarkAsAdvanced()
        .SetManipulatedType("number");

    extension.AddCondition("MusicChannelPitch",
                   GD_T("Pitch of the music on a channel"),
                   GD_T("Test the pitch ( speed ) of the music on specified channel. 1 is the default pitch."),
                   GD_T("The volume of the music on channel _PARAM1_ is _PARAM2__PARAM3_"),
                   GD_T("Audio/Musics on channels"),
                   "res/conditions/musicVolume24.png",
                   "res/conditions/musicVolume.png")
        .AddCodeOnlyParameter("currentScene", "")
        .AddParameter("expression", GD_T("Canal ( 0 - 15 )"), "",false)
        .AddParameter("relationalOperator", GD_T("Sign of the test"), "",false)
        .AddParameter("expression", GD_T("Pitch to test"), "",false)
        .MarkAsAdvanced()
        .SetManipulatedType("number");

    extension.AddCondition("SoundChannelPlayingOffset",
                   GD_T("Playing offset of the sound on a channel"),
                   GD_T("Test the playing offset of the sound on the specified channel."),
                   GD_T("The playing offset of the sound on channel _PARAM1_ is _PARAM2__PARAM3_"),
                   GD_T("Audio/Sounds on channels"),
                   "res/conditions/sonVolume24.png",
                   "res/conditions/sonVolume.png")
        .AddCodeOnlyParameter("currentScene", "")
        .AddParameter("expression", GD_T("Canal ( 0 - 15 )"), "",false)
        .AddParameter("relationalOperator", GD_T("Sign of the test"), "",false)
        .AddParameter("expression", GD_T("Position ( in seconds )"), "",false)
        .MarkAsAdvanced()
        .SetManipulatedType("number");

    extension.AddCondition("MusicChannelPlayingOffset",
                   GD_T("Playing offset of the music on a channel"),
                   GD_T("Test the playing offset of the music on the specified channel."),
                   GD_T("The playing offset of the music on channel _PARAM1_ is _PARAM2__PARAM3_"),
                   GD_T("Audio/Musics on channels"),
                   "res/conditions/musicVolume24.png",
                   "res/conditions/musicVolume.png")
        .AddCodeOnlyParameter("currentScene", "")
        .AddParameter("expression", GD_T("Canal ( 0 - 15 )"), "",false)
        .AddParameter("relationalOperator", GD_T("Sign of the test"), "",false)
        .AddParameter("expression", GD_T("Position ( in seconds )"), "",false)
        .MarkAsAdvanced()
        .SetManipulatedType("number");

    extension.AddExpression("SoundChannelPlayingOffset", GD_T("Sound playing offset"), GD_T("Sound playing offset"), GD_T("Sounds"), "res/actions/son.png")
        .AddCodeOnlyParameter("currentScene", "")
        .AddParameter("expression", GD_T("Channel"), "",false);

    extension.AddExpression("MusicChannelPlayingOffset", GD_T("Music playing offset"), GD_T("Music playing offset"), GD_T("Musics"), "res/actions/music.png")
        .AddCodeOnlyParameter("currentScene", "")
        .AddParameter("expression", GD_T("Channel"), "",false);

    extension.AddExpression("SoundChannelVolume", GD_T("Sound volume"), GD_T("Sound volume"), GD_T("Sounds"), "res/actions/son.png")
        .AddCodeOnlyParameter("currentScene", "")
        .AddParameter("expression", GD_T("Channel"), "",false);

    extension.AddExpression("MusicChannelVolume", GD_T("Music volume"), GD_T("Music volume"), GD_T("Musics"), "res/actions/music.png")
        .AddCodeOnlyParameter("currentScene", "")
        .AddParameter("expression", GD_T("Channel"), "",false);

    extension.AddExpression("SoundChannelPitch", GD_T("Sound's pitch"), GD_T("Sound's pitch"), GD_T("Sounds"), "res/actions/son.png")
        .AddCodeOnlyParameter("currentScene", "")
        .AddParameter("expression", GD_T("Channel"), "",false);

    extension.AddExpression("MusicChannelPitch", GD_T("Music's pitch"), GD_T("Music's pitch"), GD_T("Musics"), "res/actions/music.png")
        .AddCodeOnlyParameter("currentScene", "")
        .AddParameter("expression", GD_T("Channel"), "",false);

    extension.AddExpression("GlobalVolume", GD_T("Global volume"), GD_T("Global volume value"), GD_T("Sound level"), "res/conditions/volume.png")
        .AddCodeOnlyParameter("currentScene", "");

    #endif
}

}
